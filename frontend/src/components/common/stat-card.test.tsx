import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatCard } from "@/components/common/stat-card";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Aktywne projekty" value={7} />);

    expect(screen.getByText("Aktywne projekty")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
