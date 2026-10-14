import { Brain, Briefcase, LayoutDashboard, Megaphone, MessagesSquare, PhoneCall, Users, Wallet, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  core?: boolean;
}

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "Главная", icon: LayoutDashboard },
  { href: "/inbox", label: "Заявки и чаты", icon: MessagesSquare, core: true },
  { href: "/accounting", label: "Бухгалтерия", icon: Wallet, core: true },
  { href: "/marketing", label: "Маркетинг", icon: Megaphone, core: true },
];

export const NAV_EXTRA: NavItem[] = [
  { href: "/staff", label: "Сотрудники", icon: Users },
  { href: "/hr", label: "HR и найм", icon: Briefcase },
  { href: "/calls", label: "Звонки", icon: PhoneCall },
];

export const NAV_SETTINGS: NavItem = { href: "/settings", label: "Мозг агента", icon: Brain };
