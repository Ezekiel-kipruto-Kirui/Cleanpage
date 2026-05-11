import { toast } from "sonner";

/**
 * Export data to CSV format
 */
export const exportToCSV = (data: any[], filename: string) => {
  if (data.length === 0) {
    toast.error("No data to export");
    return;
  }

  try {
    // Extract headers
    const headers = Object.keys(data[0]);
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle nested objects and arrays
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value).replace(/"/g, '""');
          }
          return `"${String(value || '').replace(/"/g, '""')}"`;
        }).join(",")
      )
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("CSV exported successfully!");
  } catch (error) {
    console.error("CSV export error:", error);
    toast.error("Failed to export CSV file");
  }
};

/**
 * Export data to Excel format
 */
export const exportToExcel = async (data: any[], filename: string) => {
  try {
    const XLSX = await import('xlsx');
    
    if (data.length === 0) {
      toast.error("No data to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    
    XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast.success("Excel file exported successfully!");
  } catch (error) {
    console.error("Excel export error:", error);
    toast.error("Failed to export Excel file. Please try CSV export instead.");
  }
};

/**
 * Export data to JSON format
 */
export const exportToJSON = (data: any[], filename: string) => {
  if (data.length === 0) {
    toast.error("No data to export");
    return;
  }

  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("JSON exported successfully!");
  } catch (error) {
    console.error("JSON export error:", error);
    toast.error("Failed to export JSON file");
  }
};

/**
 * Prepare data for export by flattening nested objects
 */
export const prepareDataForExport = (data: any[]): any[] => {
  return data.map(item => {
    const flattened: any = {};
    
    Object.keys(item).forEach(key => {
      const value = item[key];
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Flatten nested objects
        Object.keys(value).forEach(nestedKey => {
          flattened[`${key}_${nestedKey}`] = value[nestedKey];
        });
      } else if (Array.isArray(value)) {
        // Handle arrays by converting to string
        flattened[key] = value.join(', ');
      } else {
        flattened[key] = value;
      }
    });
    
    return flattened;
  });
};

/**
 * Format date for filename
 */
export const formatDateForFilename = (date: Date = new Date()): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Export data with custom formatting
 */
export const exportData = async (
  data: any[], 
  filename: string, 
  format: 'csv' | 'excel' | 'json' = 'csv',
  options?: {
    flatten?: boolean;
    customHeaders?: Record<string, string>;
  }
) => {
  let exportData = [...data];
  
  if (options?.flatten) {
    exportData = prepareDataForExport(exportData);
  }
  
  if (options?.customHeaders) {
    // Apply custom headers if provided
    exportData = exportData.map(item => {
      const renamed: any = {};
      Object.keys(item).forEach(key => {
        const newKey = options.customHeaders![key] || key;
        renamed[newKey] = item[key];
      });
      return renamed;
    });
  }
  
  switch (format) {
    case 'csv':
      exportToCSV(exportData, filename);
      break;
    case 'excel':
      await exportToExcel(exportData, filename);
      break;
    case 'json':
      exportToJSON(exportData, filename);
      break;
    default:
      exportToCSV(exportData, filename);
  }
};