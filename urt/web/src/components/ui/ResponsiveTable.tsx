import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import styles from './ResponsiveTable.module.css';

interface ResponsiveTableProps {
  children: ReactNode;
  className?: string;
  rowHeading?: string;
  role?: 'region';
  'aria-label'?: string;
  tabIndex?: number;
  style?: CSSProperties;
}

/** Adds mobile key/value labels from each table's existing column headings. */
export function ResponsiveTable({
  children,
  className,
  rowHeading,
  role,
  'aria-label': ariaLabel,
  tabIndex,
  style,
}: ResponsiveTableProps) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    root.current?.querySelectorAll('table').forEach((table) => {
      const headings = Array.from(table.querySelectorAll('thead tr:first-child th'), (cell) => cell.textContent?.trim() ?? '');
      table.querySelectorAll('tbody tr').forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('td'));
        const fullRow = cells.length === 1 && cells[0].colSpan > 1;
        if (rowHeading && !fullRow) row.setAttribute('data-row-label', `${rowHeading} ${rowIndex + 1}`);
        else row.removeAttribute('data-row-label');

        let columnIndex = 0;
        cells.forEach((cell) => {
          const heading = headings[columnIndex] || `Kolom ${columnIndex + 1}`;
          cell.setAttribute('data-label', heading);
          if (fullRow) cell.setAttribute('data-full-row', '');
          else cell.removeAttribute('data-full-row');
          columnIndex += cell.colSpan;
        });
      });
    });
  }, [children, rowHeading]);

  return (
    <div
      ref={root}
      className={[styles.responsiveTable, className].filter(Boolean).join(' ')}
      data-responsive-table
      role={role}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      style={style}
    >
      {children}
    </div>
  );
}
