import { AttackPower } from "./attack-power.model";
import { Coordinate } from "./coordinate.model";

export class SpyReport {
	public resources: number;
	public metal: number;
	public crystal: number;
	public deuterium: number;
	public flottes: AttackPower;
	public defenses: AttackPower;
	public coordinates: Coordinate;
	public activity: number;
	public player: string;
	public butin: number;
	public cargoCapacity: number;

	public get noCargo(): number {
		const butin = this.butin / 100;
		return Math.ceil((this.resources * butin) / this.cargoCapacity);
	}

	public get smallCargo(): number {
		return Math.ceil(this.noCargo * 5);
	}

	constructor(cargoCapacity: number) {
		this.cargoCapacity = cargoCapacity;
	}

	fromJson(element: SpyReport): this {
		Object.keys(element).forEach((key: string) => {
			this[key] = element[key];
		});

		this.flottes = new AttackPower(element.flottes.amount);
		this.defenses = new AttackPower(element.defenses.amount);
		this.coordinates = new Coordinate().fromJson(element.coordinates);

		return this;
	}

	setCoordinates(coord: string): void {
		const group = coord.split(":");
		const coords = new Coordinate();
		coords.galaxy = +group[0];
		coords.system = +group[1];
		coords.position = +group[2];
		this.coordinates = coords;
	}

	getCoordinates(): string {
		return this.coordinates.toString();
	}

	isInactif(): boolean {
		return this.player?.includes("(i)");
	}

	isStronglyInactif(): boolean {
		return this.player?.includes("(I)");
	}

	isHonorable(): boolean {
		return this.player?.includes("(ph)");
	}
}
