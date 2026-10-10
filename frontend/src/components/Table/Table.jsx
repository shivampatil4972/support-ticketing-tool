const Table = ({ columns, data, onRowClick }) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className="table-premium min-w-full">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-12 text-slate-500 font-medium"
              >
                <div className="flex flex-col items-center justify-center gap-3">
                  <svg className="w-10 h-10 text-slate-600 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  No data available
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr 
                key={row.id || index} 
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? 'cursor-pointer hover:bg-slate-800/30' : ''}
              >
                {columns.map((column) => (
                  <td key={column.key} className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;