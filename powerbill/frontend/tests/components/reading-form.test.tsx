import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReadingForm } from "@/components/customer/reading-form";

const meter = {
  id: "meter-1", meter_number: "45-7821-9032", customer_id: "user-1", tariff_id: "tariff-1",
  opening_reading: "6658.000", is_active: true, assigned_at: "2026-09-01T00:00:00Z",
};

describe("ReadingForm", () => {
  it("uses a decimal mobile keyboard hint and blocks negative readings", async () => {
    const user = userEvent.setup();
    render(<ReadingForm meters={[meter]} />);
    expect(screen.getByLabelText("Current reading (kWh)")).toHaveAttribute("inputmode", "decimal");
    await user.selectOptions(screen.getByLabelText("Meter"), "meter-1");
    await user.type(screen.getByLabelText("Current reading (kWh)"), "-1");
    await user.click(screen.getByRole("button", { name: /submit reading/i }));
    expect(await screen.findByText("Enter a valid non-negative reading.")).toBeInTheDocument();
  });

  it("disables submission when the customer has no meter", () => {
    render(<ReadingForm meters={[]} />);
    expect(screen.getByRole("button", { name: /submit reading/i })).toBeDisabled();
  });
});
