// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { DataTable, type DataTableColumn } from "@/components/data-table"

vi.mock("@/features/account/hooks/use-auth", () => ({
  useAuth: () => ({ currentUser: null }),
}))

type Item = { id: string; name: string; value: number }

const columns: DataTableColumn<Item>[] = [
  {
    id: "name",
    header: "Name",
    cell: (r) => r.name,
    sortable: true,
    sortValue: (r) => r.name,
  },
  {
    id: "value",
    header: "Value",
    cell: (r) => r.value,
    sortable: true,
    sortValue: (r) => r.value,
  },
]

const data: Item[] = [
  { id: "1", name: "Charlie", value: 20 },
  { id: "2", name: "Alice", value: 30 },
  { id: "3", name: "Bob", value: 10 },
]

function getKey(row: Item) {
  return row.id
}

describe("DataTable", () => {
  it("renders all rows", () => {
    render(<DataTable columns={columns} data={data} getRowKey={getKey} />)
    expect(screen.getByText("Alice")).toBeInTheDocument()
    expect(screen.getByText("Bob")).toBeInTheDocument()
    expect(screen.getByText("Charlie")).toBeInTheDocument()
  })

  it("renders column headers", () => {
    render(<DataTable columns={columns} data={data} getRowKey={getKey} />)
    expect(screen.getByText("Name")).toBeInTheDocument()
    expect(screen.getByText("Value")).toBeInTheDocument()
  })

  it("shows empty message when data is empty", () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        getRowKey={getKey}
        emptyMessage="No items found."
      />,
    )
    expect(screen.getByText("No items found.")).toBeInTheDocument()
  })

  it("paginates with default page size", () => {
    const bigData = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
      value: i,
    }))
    render(<DataTable columns={columns} data={bigData} getRowKey={getKey} />)
    expect(screen.getByText("Item 0")).toBeInTheDocument()
    expect(screen.queryByText("Item 20")).not.toBeInTheDocument()
    expect(screen.getByText("1\u201320 of 25")).toBeInTheDocument()
  })

  it("navigates to next page", async () => {
    const user = userEvent.setup()
    const bigData = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
      value: i,
    }))
    render(<DataTable columns={columns} data={bigData} getRowKey={getKey} />)
    const nextBtn = screen
      .getAllByRole("button")
      .find((b) => b.getAttribute("aria-label") === "Next page")!
    await user.click(nextBtn)
    expect(screen.getByText("Item 20")).toBeInTheDocument()
    expect(screen.queryByText("Item 0")).not.toBeInTheDocument()
  })

  it("sorts columns when sortable headers are clicked", async () => {
    const user = userEvent.setup()
    render(<DataTable columns={columns} data={data} getRowKey={getKey} />)
    const nameHeader = screen.getByText("Name")
    await user.click(nameHeader)
    const rows = screen.getAllByRole("row")
    expect(within(rows[1]).getByText("Alice")).toBeInTheDocument()
    expect(within(rows[2]).getByText("Bob")).toBeInTheDocument()
    expect(within(rows[3]).getByText("Charlie")).toBeInTheDocument()
  })

  it("searches rows when searchable is enabled", async () => {
    const user = userEvent.setup()
    render(
      <DataTable
        columns={columns}
        data={data}
        getRowKey={getKey}
        searchable
        getSearchValue={(row, colId) => (colId === "name" ? row.name : null)}
      />,
    )
    const input = screen.getByPlaceholderText("Search...")
    await user.type(input, "Bob")
    expect(screen.getByText("Bob")).toBeInTheDocument()
    expect(screen.queryByText("Alice")).not.toBeInTheDocument()
    expect(screen.queryByText("Charlie")).not.toBeInTheDocument()
  })

  it("displays record count when pagination is disabled", () => {
    render(
      <DataTable
        columns={columns}
        data={data}
        getRowKey={getKey}
        id="test"
        pageSize={0}
      />,
    )
    expect(screen.getByText("3 records")).toBeInTheDocument()
  })

  it("calls onRowClick when a row is clicked", async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <DataTable
        columns={columns}
        data={data}
        getRowKey={getKey}
        onRowClick={onClick}
      />,
    )
    await user.click(screen.getByText("Bob"))
    expect(onClick).toHaveBeenCalledWith(data[2])
  })

  it("hides pagination when pageSize is 0", () => {
    const bigData = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      name: `Item ${i}`,
      value: i,
    }))
    render(
      <DataTable
        columns={columns}
        data={bigData}
        getRowKey={getKey}
        pageSize={0}
      />,
    )
    // All 25 rows should be visible
    expect(screen.getByText("Item 0")).toBeInTheDocument()
    expect(screen.getByText("Item 24")).toBeInTheDocument()
    // No pagination text
    expect(screen.queryByText(/\d+\u2013\d+ of \d+/)).not.toBeInTheDocument()
  })
})
