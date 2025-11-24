import pandas as pd
from io import BytesIO
from typing import List, Dict, Any

def export_to_csv(data: List[Dict[str, Any]]) -> bytes:
    """Export data to CSV format"""
    df = pd.DataFrame(data)
    return df.to_csv(index=False).encode('utf-8')

def export_to_xlsx(data: List[Dict[str, Any]]) -> bytes:
    """Export data to XLSX format"""
    df = pd.DataFrame(data)
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Results')
    output.seek(0)
    return output.getvalue()
