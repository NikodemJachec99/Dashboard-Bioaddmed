import { useTheme } from "@/app/providers/theme-provider";
import { Button } from "@/components/ui/button";
import { MoonStar, SunMedium } from "@/components/ui/icons";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button variant="secondary" className="h-11 gap-2 px-4" onClick={toggleTheme}>
      {theme === "light" ? <MoonStar size={16} /> : <SunMedium size={16} />}
      {theme === "light" ? "Dark" : "Light"}
    </Button>
  );
}
