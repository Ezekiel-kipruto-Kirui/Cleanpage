import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchApi } from "@/services/api"; // Using fetchApi to target 'laundry' app
import { ExpenseField, ExpenseRecord } from "@/services/types"
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
import { Loader2, Plus, Trash2, Receipt, Store, DollarSign, Calendar, Filter, RotateCcw, Tag } from "lucide-react";

// --- Helper to handle Paginated vs Array responses ---
const ensureArray = <T,>(data: unknown): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'object' && data !== null) {
    const anyData = data as any;
    if (Array.isArray(anyData.results)) return anyData.results as T[];
    if (Array.isArray(anyData.data)) return anyData.data as T[];
  }
  return [];
};

export default function Expenses() {
  const queryClient = useQueryClient();
  const [shopFilter, setShopFilter] = useState<string>("Shop A");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  
  // Form states
  const [newExpense, setNewExpense] = useState({
    field_id: 0,
    amount: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    shop: "Shop A" as 'Shop A' | 'Shop B',
  });
  const [newField, setNewField] = useState({ label: "" });

  // Set default dates on component mount
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    setEndDate(today);
    setStartDate(firstDay);
  }, []);

  // Fetching from Laundry App explicitly
  const { data: expenseFieldsRaw, isLoading: fieldsLoading } = useQuery({
    queryKey: ['expense-fields', 'laundry'],
    queryFn: () => fetchApi<ExpenseField[]>("expense-fields/", undefined, "laundry"),
  });

  const { data: expenseRecordsRaw, isLoading: recordsLoading } = useQuery({
    queryKey: ['expense-records', 'laundry'],
    queryFn: () => fetchApi<ExpenseRecord[]>("expense-records/", undefined, "laundry"),
  });

  // Safe array extraction
  const expenseFields = useMemo(() => ensureArray<ExpenseField>(expenseFieldsRaw), [expenseFieldsRaw]);
  const expenseRecords = useMemo(() => ensureArray<ExpenseRecord>(expenseRecordsRaw), [expenseRecordsRaw]);

  const createExpenseMutation = useMutation({
    mutationFn: (data: any) => fetchApi<ExpenseRecord>("expense-records/", {
      method: "POST",
      body: JSON.stringify(data)
    }, "laundry"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-records', 'laundry'] });
      toast.success('Expense added successfully!');
      setIsAddDialogOpen(false);
      setNewExpense({
        field_id: 0,
        amount: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        shop: "Shop A",
      });
    },
    onError: () => {
      toast.error('Failed to add expense');
    },
  });

  const createFieldMutation = useMutation({
    mutationFn: (data: any) => fetchApi<ExpenseField>("expense-fields/", {
      method: "POST",
      body: JSON.stringify(data)
    }, "laundry"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-fields', 'laundry'] });
      toast.success('Expense category added!');
      setIsFieldDialogOpen(false);
      setNewField({ label: "" });
    },
    onError: () => {
      toast.error('Failed to add category');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: number) => fetchApi<void>(`expense-records/${id}/`, {
      method: "DELETE"
    }, "laundry"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-records', 'laundry'] });
      toast.success('Expense deleted');
    },
    onError: () => {
      toast.error('Failed to delete expense');
    },
  });


  // Filter records based on shop and date range
  const filteredRecords = expenseRecords.filter((record: ExpenseRecord) => {
    // Shop filter (Laundry A or B)
    if (shopFilter !== "all" && record.shop !== shopFilter) {
      return false;
    }
    
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
  const totalExpenses = filteredRecords.reduce((sum: number, r: ExpenseRecord) => {
    return sum + (Number(r.amount) || 0);
  }, 0);
  
  const recordCount = filteredRecords.length;

  const getFieldName = (record: ExpenseRecord) => {
    return record.field?.label || expenseFields.find((field) => field.id === record.field_id)?.label || "Unknown";
  };

  // Date range description
  const dateRangeDescription = startDate && endDate 
    ? `from ${formatDate(startDate)} to ${formatDate(endDate)}`
    : '';

  const handleAddExpense = () => {
    if (!newExpense.field_id || !newExpense.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    createExpenseMutation.mutate({
      field_id: newExpense.field_id,
      amount: parseFloat(newExpense.amount),
      description: newExpense.description,
      date: newExpense.date,
      shop: newExpense.shop,
      field: undefined
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
  };

  const handleResetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    setEndDate(today);
    setStartDate(firstDay);
    setShopFilter("Shop A");
  };

  const getFieldColor = (fieldLabel: string) => {
    const colors: Record<string, string> = {
      'Food': 'bg-blue-100 text-blue-800',
      'Transport': 'bg-blue-200 text-blue-800',
      'Entertainment': 'bg-blue-300 text-blue-800',
      'Utilities': 'bg-blue-400 text-blue-800',
    };
    return colors[fieldLabel] || 'bg-blue-500 text-white';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Laundry Expense Records</h1>
      </div>

      {/* Header Section with Date & Shop Filter */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Date & Shop Filter Form */}
          <form 
            onSubmit={handleFilter}
            className="flex flex-col sm:flex-row gap-2 bg-white p-3 rounded-lg border border-gray-200 shadow-sm w-full"
          >
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center w-full">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Shop:</label>
                <Select value={shopFilter} onValueChange={setShopFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select Shop" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Shop A">Shop A</SelectItem>
                    <SelectItem value="Shop B">Shop B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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
                <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
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
            <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
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
                    Description
                  </th>
                  <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-blue-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRecords.map((record: ExpenseRecord) => {
                  const fieldName = getFieldName(record);
                  return (
                  <tr key={record.id} className="hover:bg-blue-50 transition-colors duration-150">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatDate(record.date)}</div>
                      <div className="text-xs text-gray-500 sm:hidden">
                        {fieldName}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap hidden sm:table-cell">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10">
                          <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center ${getFieldColor(fieldName)}`}>
                            {fieldName.charAt(0)}
                          </div>
                        </div>
                        <div className="ml-2 sm:ml-4">
                          <div className="text-sm font-medium text-gray-900">{fieldName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-blue-700">Ksh {Number(record.amount).toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="text-sm text-gray-500 max-w-xs truncate">{record.description || "-"}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-center space-x-2">
                        <button
                          className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 transition-colors duration-150"
                          title="Edit"
                          onClick={() => toast.info('Edit functionality not implemented yet')}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 transition-colors duration-150"
                          title="Delete"
                          onClick={() => deleteExpenseMutation.mutate(record.id)}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
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
            <DialogTitle>Add New Laundry Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Shop</Label>
              <Select
                value={newExpense.shop}
                onValueChange={(value: 'Shop A' | 'Shop B') => setNewExpense({ ...newExpense, shop: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shop A">Shop A</SelectItem>
                  <SelectItem value="Shop B">Shop B</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  {expenseFields.map((field: ExpenseField) => (
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
              <Label htmlFor="expense-description">Description (optional)</Label>
              <Textarea
                id="expense-description"
                value={newExpense.description}
                onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                placeholder="What was this expense for?"
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
                placeholder="e.g., Utilities, Supplies"
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
          border:1px solid #d1d5db;
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
