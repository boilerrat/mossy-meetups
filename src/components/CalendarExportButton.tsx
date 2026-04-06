interface CalendarExportButtonProps {
  href: string;
  label?: string;
}

export function CalendarExportButton({ href, label = "Add to calendar" }: CalendarExportButtonProps) {
  return (
    <a href={href} download className="btn btn-ghost btn-sm">
      {label}
    </a>
  );
}
