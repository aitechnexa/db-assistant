import csv
import io
from typing import List, Dict, Any
from openpyxl import Workbook
from openpyxl.utils import get_column_letter

def export_to_csv(data: List[Dict[str, Any]]) -> bytes:
    """Export data to CSV format using memory-efficient streaming"""
    if not data:
        return b""
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)
    return output.getvalue().encode('utf-8')

def export_to_xlsx(data: List[Dict[str, Any]]) -> bytes:
    """Export data to XLSX format using openpyxl directly"""
    if not data:
        return b""
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Results"
    
    # Write headers
    headers = list(data[0].keys())
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = cell.font.copy(bold=True)
    
    # Write data rows
    for row_idx, row_data in enumerate(data, 2):
        for col_idx, header in enumerate(headers, 1):
            value = row_data.get(header)
            # Handle None values
            if value is None:
                value = ""
            ws.cell(row=row_idx, column=col_idx, value=value)
    
    # Auto-adjust column widths
    for col_idx, header in enumerate(headers, 1):
        max_length = len(str(header))
        for row in data[:100]:  # Sample first 100 rows for width calculation
            cell_value = str(row.get(header, ""))
            max_length = max(max_length, len(cell_value))
        adjusted_width = min(max_length + 2, 50)  # Cap at 50
        ws.column_dimensions[get_column_letter(col_idx)].width = adjusted_width
    
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.getvalue()
