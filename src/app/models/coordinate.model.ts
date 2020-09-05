export class Coordinate {
	public galaxy: number;
	public system: number;
	public position: number;

	constructor() {}

	fromJson(element: Coordinate): this {
		this.galaxy = element.galaxy;
		this.system = element.system;
		this.position = element.position;

		return this;
	}

	toString(): string {
		return `[${this.galaxy}:${this.system}:${this.position}]`;
	}
}
