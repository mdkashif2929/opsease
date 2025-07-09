import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Calendar, Users, UserCheck, Clock } from "lucide-react";
import type { Attendance, Employee } from "@shared/schema";

export default function AttendancePage() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: attendance, isLoading: attendanceLoading } = useQuery({
    queryKey: ["/api/attendance", { date: selectedDate }],
    enabled: isAuthenticated,
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    enabled: isAuthenticated,
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async (attendanceRecord: any) => {
      return await apiRequest("/api/attendance", "POST", attendanceRecord);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Success", description: "Attendance marked successfully" });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to mark attendance",
        variant: "destructive",
      });
    },
  });

  const handleBulkAttendance = () => {
    const records = Object.entries(attendanceData).map(([employeeId, data]) => {
      const record = {
        employeeId,
        date: selectedDate,
        status: data.status || 'present',
        checkIn: data.checkIn ? `${selectedDate}T${data.checkIn}:00+05:30` : null,
        checkOut: data.checkOut ? `${selectedDate}T${data.checkOut}:00+05:30` : null,
        workHours: data.workHours || "0",
        overtime: data.overtime || "0",
        notes: data.notes || "",
      };

      return record;
    });

    // Process each record
    records.forEach(record => {
      if (record.status) {
        markAttendanceMutation.mutate(record);
      }
    });

    setIsDialogOpen(false);
    setAttendanceData({});
  };

  const updateAttendanceData = (employeeId: string, field: string, value: any) => {
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value,
      }
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800";
      case "absent":
        return "bg-red-100 text-red-800";
      case "half_day":
        return "bg-yellow-100 text-yellow-800";
      case "late":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const getDepartmentStats = () => {
    if (!attendance || !employees) return {};
    
    const stats: Record<string, { present: number; total: number }> = {};
    const employeeMap = new Map(employees.map((emp: Employee) => [emp.id, emp]));
    
    employees.forEach((employee: Employee) => {
      if (!stats[employee.department]) {
        stats[employee.department] = { present: 0, total: 0 };
      }
      stats[employee.department].total++;
    });
    
    attendance.forEach((record: any) => {
      const employee = employeeMap.get(record.employeeId);
      if (employee && record.status === 'present') {
        stats[employee.department].present++;
      }
    });
    
    return stats;
  };

  const filteredEmployees = employees?.filter((employee: Employee) => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === "all" || employee.department === departmentFilter;
    return matchesSearch && matchesDepartment;
  }) || [];

  // Create a map of existing attendance records for quick lookup
  const attendanceMap = new Map(
    attendance?.map((record: any) => [record.employeeId, record]) || []
  );

  const presentCount = attendance?.filter((record: any) => record.status === 'present')?.length || 0;
  const absentCount = attendance?.filter((record: any) => record.status === 'absent')?.length || 0;
  const totalEmployees = employees?.length || 0;
  const departmentStats = getDepartmentStats();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Employee Attendance</h1>
            <p className="text-muted-foreground mt-1">Track and manage employee attendance</p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <div>
              <Label htmlFor="selectedDate">Date</Label>
              <Input
                id="selectedDate"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-40"
              />
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Mark Attendance
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Mark Attendance for {new Date(selectedDate).toLocaleDateString()}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {filteredEmployees.map((employee: Employee) => {
                    const existingRecord = attendanceMap.get(employee.id);
                    const currentData = attendanceData[employee.id] || {};
                    
                    return (
                      <Card key={employee.id} className="p-4">
                        <div className="flex items-center space-x-4 mb-4">
                          <Avatar>
                            <AvatarImage src="" alt={employee.name} />
                            <AvatarFallback>
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-medium">{employee.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {employee.employeeId} • {employee.department}
                            </p>
                          </div>
                          {existingRecord && (
                            <Badge className={getStatusColor(existingRecord.status)}>
                              Already marked: {formatStatus(existingRecord.status)}
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label>Status</Label>
                            <Select 
                              value={currentData.status || existingRecord?.status || ""} 
                              onValueChange={(value) => updateAttendanceData(employee.id, 'status', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="half_day">Half Day</SelectItem>
                                <SelectItem value="late">Late</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label>Check In</Label>
                            <Input
                              type="time"
                              value={currentData.checkIn || (existingRecord?.checkIn ? 
                                new Date(existingRecord.checkIn).toLocaleTimeString('en-IN', { 
                                  timeZone: 'Asia/Kolkata', 
                                  hour12: false 
                                }).slice(0, 5) : "")}
                              onChange={(e) => updateAttendanceData(employee.id, 'checkIn', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label>Check Out</Label>
                            <Input
                              type="time"
                              value={currentData.checkOut || (existingRecord?.checkOut ? 
                                new Date(existingRecord.checkOut).toLocaleTimeString('en-IN', { 
                                  timeZone: 'Asia/Kolkata', 
                                  hour12: false 
                                }).slice(0, 5) : "")}
                              onChange={(e) => updateAttendanceData(employee.id, 'checkOut', e.target.value)}
                            />
                          </div>
                          
                          <div>
                            <Label>Work Hours</Label>
                            <Input
                              type="number"
                              step="0.5"
                              value={currentData.workHours || existingRecord?.workHours || ""}
                              onChange={(e) => updateAttendanceData(employee.id, 'workHours', e.target.value)}
                              placeholder="8.0"
                            />
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkAttendance}
                    className="bg-primary hover:bg-primary/90 text-white"
                    disabled={markAttendanceMutation.isPending}
                  >
                    {markAttendanceMutation.isPending ? "Saving..." : "Save Attendance"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Total Employees</p>
                  <p className="text-3xl font-bold text-foreground">{totalEmployees}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="text-blue-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Present Today</p>
                  <p className="text-3xl font-bold text-foreground">{presentCount}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <UserCheck className="text-green-600 h-6 w-6" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0}% attendance rate
              </p>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">Absent Today</p>
                  <p className="text-3xl font-bold text-foreground">{absentCount}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <Clock className="text-red-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">On Time</p>
                  <p className="text-3xl font-bold text-foreground">
                    {attendance?.filter((r: any) => r.status === 'present' && !r.status.includes('late'))?.length || 0}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Calendar className="text-purple-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Statistics */}
        <Card className="mb-8">
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">Department-wise Attendance</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(departmentStats).map(([department, stats]) => (
                <div key={department} className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-foreground capitalize">
                    {department.replace('_', ' ')}
                  </h3>
                  <div className="mt-2">
                    <div className="text-2xl font-bold text-primary">
                      {stats.present}/{stats.total}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}% present
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Filters Section */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search employees by name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="cutting">Cutting</SelectItem>
                  <SelectItem value="stitching">Stitching</SelectItem>
                  <SelectItem value="quality_control">Quality Control</SelectItem>
                  <SelectItem value="packaging">Packaging</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-foreground">
              Attendance Record for {new Date(selectedDate).toLocaleDateString()}
            </h2>
          </CardHeader>
          <CardContent>
            {attendanceLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : !attendance || attendance.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No attendance records for this date</p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Mark Attendance
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Work Hours</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src="" alt={record.employee.name} />
                              <AvatarFallback>
                                {record.employee.name.split(' ').map((n: string) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{record.employee.name}</div>
                              <div className="text-sm text-muted-foreground">{record.employee.employeeId}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">
                          {record.employee.department.replace('_', ' ')}
                        </TableCell>
                        <TableCell>
                          {record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }) : '-'}
                        </TableCell>
                        <TableCell>
                          {record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          }) : '-'}
                        </TableCell>
                        <TableCell>{record.workHours || '0.0'} hrs</TableCell>
                        <TableCell>{record.overtime || '0.0'} hrs</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(record.status)}>
                            {formatStatus(record.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
