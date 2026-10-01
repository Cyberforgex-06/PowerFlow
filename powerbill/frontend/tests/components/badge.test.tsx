import { render, screen } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it.each([
    ["paid", "PAID", "text-status-paid"],
    ["unpaid", "UNPAID", "text-status-unpaid"],
    ["overdue", "OVERDUE", "text-status-overdue"],
    ["in_progress", "IN PROGRESS", "text-info"],
  ])("renders %s with accessible text and semantic status class", (value, label, css) => {
    render(<Badge value={value} />);
    const badge = screen.getByText(label);
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass(css);
  });
});
