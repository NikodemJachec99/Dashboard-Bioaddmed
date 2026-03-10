import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function IconBase({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </IconBase>
  );
}

export function Bell(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 17H9" />
      <path d="M18 17H6l1.4-1.8a3 3 0 0 0 .6-1.8V10a4 4 0 1 1 8 0v3.4a3 3 0 0 0 .6 1.8L18 17Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

export function BookOpen(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 7a4 4 0 0 0-4-2H5a2 2 0 0 0-2 2v11a1 1 0 0 0 1.4.9A7 7 0 0 1 8 18h4" />
      <path d="M12 7a4 4 0 0 1 4-2h3a2 2 0 0 1 2 2v11a1 1 0 0 1-1.4.9A7 7 0 0 0 16 18h-4" />
      <path d="M12 7v11" />
    </IconBase>
  );
}

export function Calendar(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18" />
    </IconBase>
  );
}

export function FolderKanban(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7Z" />
      <path d="M8 11v5" />
      <path d="M12 11v2" />
      <path d="M16 11v4" />
    </IconBase>
  );
}

export function LayoutDashboard(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </IconBase>
  );
}

export function MoonStar(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M16 3h.01" />
      <path d="M18 6h2" />
      <path d="M16 9h.01" />
      <path d="M14 6h-2" />
      <path d="M19.2 13.4A7 7 0 1 1 10.6 4.8a6 6 0 0 0 8.6 8.6Z" />
    </IconBase>
  );
}

export function RadioTower(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 7v13" />
      <path d="m9 20 3-5 3 5" />
      <path d="M8 8a6 6 0 0 1 8 0" />
      <path d="M5 5a10 10 0 0 1 14 0" />
    </IconBase>
  );
}

export function ScrollText(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 6h8" />
      <path d="M8 10h8" />
      <path d="M8 14h5" />
      <path d="M7 3h10a3 3 0 0 1 0 6H7a2 2 0 0 0 0 4h10a3 3 0 0 1 0 6H8a5 5 0 0 1 0-10" />
    </IconBase>
  );
}

export function Search(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-4.2-4.2" />
    </IconBase>
  );
}

export function Settings2(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <path d="m5.6 5.6 2.1 2.1" />
      <path d="m16.3 16.3 2.1 2.1" />
      <path d="m18.4 5.6-2.1 2.1" />
      <path d="m7.7 16.3-2.1 2.1" />
      <circle cx="12" cy="12" r="3.5" />
    </IconBase>
  );
}

export function SunMedium(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
      <path d="m4.9 4.9 2.2 2.2" />
      <path d="m16.9 16.9 2.2 2.2" />
      <path d="m19.1 4.9-2.2 2.2" />
      <path d="m7.1 16.9-2.2 2.2" />
    </IconBase>
  );
}

export function Trophy(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
      <path d="M6 5H4a2 2 0 0 0 2 4h2" />
      <path d="M18 5h2a2 2 0 0 1-2 4h-2" />
      <path d="M12 11v4" />
      <path d="M9 20h6" />
      <path d="M10 15h4" />
    </IconBase>
  );
}

export function Users(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19a5 5 0 0 1 10 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 19a4 4 0 0 1 5 0" />
    </IconBase>
  );
}
