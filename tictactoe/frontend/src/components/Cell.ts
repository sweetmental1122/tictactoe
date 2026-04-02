export interface CellProps {
  value: string;   
  index: number;
  disabled: boolean;
  onClick: (index: number) => void;
}

export class Cell {
  private el: HTMLButtonElement;

  constructor(private props: CellProps) {
    this.el = document.createElement("button");
    this.el.className = this.buildClass();
    this.el.textContent = props.value !== "-" ? props.value : "";
    this.el.disabled = props.disabled;
    this.el.dataset.index = String(props.index);
    this.el.setAttribute("aria-label", `Cell ${props.index + 1}: ${props.value !== "-" ? props.value : "empty"}`);
    if (!props.disabled) {
      this.el.addEventListener("click", () => props.onClick(props.index));
    }
  }

  private buildClass(): string {
    const { value } = this.props;
    const classes = ["cell"];
    if (value !== "-") classes.push("taken");
    if (value === "X") classes.push("x");
    if (value === "O") classes.push("o");
    return classes.join(" ");
  }

  getElement(): HTMLButtonElement {
    return this.el;
  }
}
