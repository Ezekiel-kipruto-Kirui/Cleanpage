import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, Receipt, DollarSign, Calendar, Edit, Filter, RotateCcw, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/services/url";
import { HotelExpenseField, HotelExpenseRecord } from "@/services/types";
import { getAccessToken } from "@/services/api";

const EXPENSE_FIELDS_URL = `${API_BASE_URL}/Hotel/Hotelexpense-fields/`;
const EXPENSE_RECORDS_URL = `${API_BASE_URL}/Hotel/Hotelexpense-records/`;

const ensureArray = <T,>(data: unknown): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'object') {
    const value = data as { results?: unknown; data?: unknown };
    if (Array.isArray(value.results)) return value.results as T[];
    if (Array.isArray(value.data)) return value.data as T[];
  }
  return [];
};

// API functions
const fetchExpenseFields = async (): Promise<HotelExpenseField[]> => {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(EXPENSE_FIELDS_URL, {
    headers,
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch expense fields');
  }
  return ensureArray<HotelExpenseField>(await response.json());
};

const fetchExpenseRecords = async (): Promise<HotelExpenseRecord[]> => {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(EXPENSE_RECORDS_URL, {
    headers,
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch expense records');
  }
  return ensureArray<HotelExpenseRecord>(await response.json());
};

const createExpenseRecord = async (data: Omit<HotelExpenseRecord, 'id' | 'field'> & { field_id: number }): Promise<HotelExpenseRecord> => {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(EXPENSE_RECORDS_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...data,
      notes: data.notes || null
    }),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create expense record');
  }
  return response.json();
};

const deleteExpenseRecord = async (id: number): Promise<void> => {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${EXPENSE_RECORDS_URL}${id}/`, {
    method: 'DELETE',
    headers,
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete expense record');
  }
};

const createExpenseField = async (data: { label: string }): Promise<HotelExpenseField> => {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(EXPENSE_FIELDS_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Failed to create expense field');
  }
  return response.json();
};

export default function HotelExpenses() {
  const queryClient = useQueryClient();
 
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  
  // Form states
  const [newExpense, setNewExpense] = useState({
    field_id: 0,
    amount: "",
    notes: "",
    date: new Date().toISOString().split('T')[0],
  });
  
  const [newField, setNewField] = useState({ label: "" });

  // Set default dates on component mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    setEndDate(today);
    setStartDate(firstDay);
  }, []);

  // Queries
  const { data: expenseFields = [], isLoading: fieldsLoading } = useQuery({
    queryKey: ['expense-fields', 'hotel'],
    queryFn: fetchExpenseFields,
  });

  const { data: expenseRecords = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['expense-records', 'hotel'],
    queryFn: fetchExpenseRecords,
  });

  // Mutations
  const createExpenseMutation = useMutation({
    mutationFn: createExpenseRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-records', 'hotel'] });
      toast.success('Expense added successfully!');
      setIsAddDialogOpen(false);
      setNewExpense({
        field_id: 0,
        amount: "",
        notes: "",
        date: new Date().toISOString().split('T')[0],
      });
    },
    onError: () => {
      toast.error('Failed to add expense');
    },
  });

  const createFieldMutation = useMutation({
    mutationFn: createExpenseField,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-fields', 'hotel'] });
      toast.success('Expense category added!');
      setIsFieldDialogOpen(false);
      setNewField({ label: "" });
    },
    onError: () => {
      toast.error('Failed to add category');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: deleteExpenseRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-records', 'hotel'] });
      toast.success('Expense deleted');
    },
    onError: () => {
      toast.error('Failed to delete expense');
    },
  });

  // Helper functions
  const getFieldName = (fieldId: number) => {
    return expenseFields.find((f: HotelExpenseField) => f.id === fieldId)?.label || 'Unknown';
  };

  // Filter records based on date range
  const filteredRecords = (expenseRecords || []).filter((record: HotelExpenseRecord) => {
    // Date range filter
    const recordDate = new Date(record.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && recordDate < start) return false;
    if (end && recordDate > end) return false;

    return true;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Stats
  const totalExpenses = filteredRecords.reduce((sum: number, r: HotelExpenseRecord) => {
    return sum + (Number(r.amount) || 0);
  }, 0);
  
  const recordCount = filteredRecords.length;

  // Date range description
  const dateRangeDescription = startDate && endDate 
    ? `from ${formatDate(startDate)} to ${formatDate(endDate)}`
    : '';

  // Event handlers
  const handleAddExpense = () => {
    if (!newExpense.field_id || !newExpense.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    createExpenseMutation.mutate({
      field_id: newExpense.field_id,
      amount: parseFloat(newExpense.amount),
      notes: newExpense.notes,
      date: newExpense.date,
    });
  };

  const handleAddField = () => {
    if (!newField.label) {
      toast.error('Please enter a category name');
      return;
    }
    createFieldMutation.mutate({ label: newField.label });
  };

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    // The filter is applied automatically through state changes
  };

  const handleResetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    setEndDate(today);
    setStartDate(firstDay);
  };

  // Get color for field badge
  const getFieldColor = (fieldLabel: string) => {
    const colors: Record<string, string> = {
      'Staff Salaries': 'bg-blue-100 text-blue-800',
      'Utilities': 'bg-green-100 text-green-800',
      'Maintenance': 'bg-yellow-100 text-yellow-800',
      'Supplies': 'bg-purple-100 text-purple-800',
      'Food': 'bg-red-100 text-red-800',
      'Transport': 'bg-indigo-100 text-indigo-800',
    };
    return colors[fieldLabel] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Hotel Expense Records</h1>
      </div>

      {/* Header Section with Date Filter */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Date Filter Form */}
          <form 
            onSubmit={handleFilter}
            className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm w-full"
          >
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">From:</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">To:</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition duration-200 flex items-center"
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg text-sm font-medium flex items-center"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Reset
                </button>
              </div>
            </div>
          </form>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsFieldDialogOpen(true)}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Tag className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              <span className="hidden xs:inline">Manage Fields</span>
              <span className="xs:hidden">Fields</span>
            </Button>

            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              <span className="hidden xs:inline">Add Expense</span>
              <span className="xs:hidden">Expense</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Blue Theme */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 mb-6 sm:mb-8">
        {/* Total Expenses Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 overflow-hidden shadow rounded-lg text-white">
          <div className="px-4 py-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-700 rounded-md p-2 sm:p-3">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-blue-100 truncate">Total Expenses</div>
                  <div className="flex items-baseline">
                    <div className="text-lg sm:text-xl font-semibold">Ksh {totalExpenses.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Number of Records Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 overflow-hidden shadow rounded-lg text-white">
          <div className="px-4 py-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-700 rounded-md p-2 sm:p-3">
                <Receipt className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <div>
                  <div className="text-xs sm:text-sm font-medium text-blue-100 truncate">Number of Expenses</div>
                  <div className="flex items-baseline">
                    <div className="text-lg sm:text-xl font-semibold">{recordCount}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      {recordsLoading || fieldsLoading ? (
        <div className="flex h-64 items-center justify-center bg-white rounded-lg shadow">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-8 sm:px-6 text-center">
            <Receipt className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No expenses recorded {dateRangeDescription}</h3>
            <p className="mt-1 text-sm text-gray-500 hidden sm:block">Get started by creating expense categories and recording your first expense.</p>
            <div className="mt-6 space-y-2 sm:space-y-0 sm:space-x-3 sm:flex sm:justify-center">
              <Button
                onClick={() => setIsFieldDialogOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Tag className="-ml-1 mr-2 h-5 w-5" />
                Create Category
              </Button>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="-ml-1 mr-2 h-5 w-5" />
                Record Expense
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-blue-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider hidden sm:table-cell">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-blue-700 uppercase tracking-wider hidden md:table-cell">
                    Notes
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record: HotelExpenseRecord) => (
                  <tr key={record.id} className="hover:bg-blue-50 transition-colors duration-150">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatDate(record.date)}</div>
                      <div className="text-xs text-gray-500 sm:hidden">
                        {record.field?.label || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
                      <Badge className={getFieldColor(record.field?.label || 'Unknown')}>
                        {record.field?.label || 'Unknown'}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-blue-700">Ksh {Number(record.amount).toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-sm text-gray-500 max-w-xs truncate">{record.notes || "-"}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 transition-colors duration-150"
                          title="Edit"
                          onClick={() => toast.info('Edit functionality not implemented yet')}
                        >
                          <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors duration-150"
                          title="Delete"
                          onClick={() => deleteExpenseMutation.mutate(record.id)}
                        >
                          <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Summary */}
          <div className="bg-blue-50 px-4 py-3 flex items-center justify-between border-t border-blue-200">
            <div className="text-sm text-blue-700">
              <p className="sm:hidden">Showing {filteredRecords.length} expenses {dateRangeDescription}</p>
              <p className="hidden sm:block">
                Showing <span className="font-medium">{filteredRecords.length}</span> expenses
                <span className="font-medium ml-1">{dateRangeDescription}</span>
              </p>
            </div>
            <div className="text-sm text-blue-600">
              Total: <span className="font-semibold">Ksh {totalExpenses.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Category</Label>
              <Select
                value={newExpense.field_id.toString()}
                onValueChange={(value) => setNewExpense({ ...newExpense, field_id: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseFields.map((field: HotelExpenseField) => (
                    <SelectItem key={field.id} value={field.id.toString()}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount (Ksh)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={newExpense.date}
                onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="expense-notes">Notes (optional)</Label>
              <Textarea
                id="expense-notes"
                value={newExpense.notes}
                onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                placeholder="Add any notes about this expense..."
              />
            </div>
            <Button onClick={handleAddExpense} className="w-full bg-blue-600 hover:bg-blue-700" disabled={createExpenseMutation.isPending}>
              {createExpenseMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Expense
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Field Dialog */}
      <Dialog open={isFieldDialogOpen} onOpenChange={setIsFieldDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="field-label">Category Name</Label>
              <Input
                id="field-label"
                value={newField.label}
                onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                placeholder="e.g., Staff Salaries, Utilities, Maintenance"
              />
            </div>
            <Button onClick={handleAddField} className="w-full bg-blue-600 hover:bg-blue-700" disabled={createFieldMutation.isPending}>
              {createFieldMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline styles for date inputs */}
      <style>{`
        input[type="date"] {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
        }

        input[type="date"]:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}
