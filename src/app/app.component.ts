import { animate, state, style, transition, trigger } from "@angular/animations";
import { AfterViewInit, Component, ViewChild } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatSort, MatSortable } from "@angular/material/sort";
import { MatTableDataSource } from "@angular/material/table";

export const TECH_LVL_STORAGE_KEY: string = "techLvl";
export const IS_COLLECTOR_STORAGE_KEY: string = "isCollector";
export const UNIVERS_URL_STORAGE_KEY: string = "universUrl";

@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"],
	animations: [
		trigger("slide", [
			state("closed", style({ height: "0px", minHeight: "0" })),
			state("opened", style({ height: "*" })),
			transition("opened <=> closed", animate("375ms cubic-bezier(0.4, 0.0, 0.2, 1)")),
		]),
	],
})
export class AppComponent implements AfterViewInit {
	public state: string = "opened";
	public rawData: string;
	public spyReports: SpyReport[] = [];
	public displayedColumns: string[] = [
		"index",
		"player",
		"resources",
		"metal",
		"crystal",
		"deuterium",
		"flottes",
		"defenses",
		"noCargo",
		"coordinates",
		"activity",
		"actions",
	];
	public dataSource: MatTableDataSource<SpyReport> = new MatTableDataSource(this.spyReports);
	public cargoCapacity: number = 41250;
	public lastElementClicked: SpyReport;
	public universUrl: string;

	public urlRegex: RegExp = /https:\/\/(www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
	public resourceRegEx: RegExp = new RegExp("Ressources: (.*)");
	public coordRegex: RegExp = new RegExp(/(\[(.*)\])/);
	public defenseRegex: RegExp = new RegExp("Défense: (.*)");
	public activityRegex: RegExp = new RegExp(/Activité(.*\D)(\d+) minutes/);
	public playerRegex: RegExp = new RegExp(/Joueur:  (.*) Activité/);
	public metalRegex: RegExp = new RegExp(/Métal: (.*)C/);
	public crystalRegex: RegExp = new RegExp(/Cristal: (.*)D/);
	public deutRegex: RegExp = new RegExp(/Deutérium: (.*)R/);
	public butinRegex: RegExp = new RegExp(/Butin: (.*)%P/);

	private _techLvl: number;
	public get techLvl(): number {
		return this._techLvl;
	}
	public set techLvl(value: number) {
		this._techLvl = value;
	}

	private _isCollector: boolean;
	public get isCollector(): boolean {
		return this._isCollector;
	}
	public set isCollector(value: boolean) {
		this._isCollector = value;
	}

	@ViewChild(MatSort, { static: false }) sort: MatSort;

	constructor(private snackbar: MatSnackBar) {
		this.techLvl = parseInt(localStorage.getItem(TECH_LVL_STORAGE_KEY), 10) ?? 0;
		this.isCollector = !!parseInt(localStorage.getItem(IS_COLLECTOR_STORAGE_KEY), 10);
		this.universUrl = localStorage.getItem(UNIVERS_URL_STORAGE_KEY);
	}

	ngAfterViewInit(): void {
		this.dataSource.sort = this.sort;
	}

	setTechStorage(value: number): void {
		localStorage.setItem(TECH_LVL_STORAGE_KEY, value.toString());
	}

	setIsCollectorStorage(value: boolean): void {
		localStorage.setItem(IS_COLLECTOR_STORAGE_KEY, value ? "1" : "0");
	}

	setUniversUrlStorage(value: string): void {
		localStorage.setItem(UNIVERS_URL_STORAGE_KEY, value);
	}

	process(): void {
		const splitRegex = new RegExp("Rapport d`((?:.|\n)*)Plus", "gm");
		const reports = this.rawData.match(splitRegex)[0].split("Plus de détails");

		for (const r of reports) {
			this.parseReport(r);
		}

		const coords = this.spyReports.map((rep: SpyReport) => rep.getCoordinates());
		const duplicatesCoord = coords.filter((coord: string, index: number) => coords.indexOf(coord) !== index);

		if (duplicatesCoord.length) {
			this.snackbar.open(`Doublon(s): ${duplicatesCoord.join(", ")}`, "Ok");
			const duplicates: SpyReport[] = [];

			this.spyReports = this.spyReports.filter((rep: SpyReport) => {
				if (
					duplicatesCoord.includes(rep.getCoordinates()) &&
					!duplicates.some((dup: SpyReport) => dup.getCoordinates() === rep.getCoordinates())
				) {
					duplicates.push(rep);
					return false;
				}
				return true;
			});
		}

		this.dataSource.data = this.spyReports;

		if (!this.dataSource.sort.active) {
			const ressourceSort: MatSortable = {
				id: "resources",
				start: "desc",
				disableClear: false,
			};
			const cargoSort: MatSortable = {
				id: "noCargo",
				start: "desc",
				disableClear: false,
			};
			this.dataSource.sort.sort(cargoSort);
			this.dataSource.sort.sort(ressourceSort);
		}

		this.state = "closed";
		this.rawData = "";
	}

	parseReport(report: string): void {
		const result = new SpyReport(this.getCargoCapacity());

		result.metal = this.stringToNumber(this.metalRegex.exec(report)[1]);
		result.crystal = this.stringToNumber(this.crystalRegex.exec(report)[1]);
		result.deuterium = this.stringToNumber(this.deutRegex.exec(report)[1]);
		result.resources = this.stringToNumber(this.resourceRegEx.exec(report)[1]);
		result.setCoordinates(this.coordRegex.exec(report)[2]);
		console.log("butin regex", this.butinRegex.exec(report));
		result.butin = parseInt(this.butinRegex.exec(report)[1], 10);

		const defense = this.defenseRegex.exec(report);
		result.defenses = new AttackPower(defense ? this.stringToNumber(defense[1]) : null);

		const fleetRegex: RegExp = new RegExp(defense ? "Flottes: (.*)D" : "Flottes: (.*)");
		const fleets = fleetRegex.exec(report);
		result.flottes = new AttackPower(fleets ? this.stringToNumber(fleets[1]) : null);

		result.activity = parseInt(this.activityRegex.exec(report)[2], 10);

		result.player = this.playerRegex.exec(report)[1];

		this.spyReports.push(result);
	}

	stringToNumber(input: string): number {
		input = input.replace(/,/g, ".");
		let multiplicator: number = 1000;
		if (input.includes("M")) {
			input = input.slice(0, -1);
			multiplicator = 1000000;
		}

		return parseFloat(input) * multiplicator;
	}

	resetFilter(): void {
		this.dataSource.data = this.spyReports;
	}

	clearDefense(): void {
		this.dataSource.data = this.spyReports.slice().filter((rep: SpyReport) => rep.defenses.amount > 0);
	}

	clearFleet(): void {
		this.dataSource.data = this.spyReports.slice().filter((rep: SpyReport) => rep.flottes.amount > 0);
	}

	clearBoth(): void {
		this.dataSource.data = this.spyReports
			.slice()
			.filter((rep: SpyReport) => rep.flottes.amount === 0 && rep.defenses.amount === 0);
	}

	navigate(report: SpyReport): void {
		this.lastElementClicked = report;
		window.open(this.getLink(report.coordinates, +report.noCargo + 1, "fleetdispatch"), "_blank");
	}

	getLink(coordinate: Coordinate, cargo: number, component: string): string {
		return `${this.universUrl}/game/index.php?page=ingame&component=${component}&galaxy=${coordinate.galaxy}&system=${coordinate.system}&position=${coordinate.position}&type=1&mission=1&cargo=${cargo}`;
	}

	remove(report: SpyReport): void {
		this.spyReports = this.spyReports.filter((rep: SpyReport) => rep !== report);
		this.dataSource.data = this.spyReports;
	}

	browse(report: SpyReport): void {
		window.open(this.getLink(report.coordinates, report.noCargo, "galaxy"), "_blank");
	}

	urlIsValid(): boolean {
		const regex = new RegExp(this.urlRegex);

		return !!this.universUrl?.match(regex);
	}

	getCargoCapacity(): number {
		const baseCapacity = 25000;
		const techBonus = baseCapacity * this.techLvl * 0.05;
		const collectorBonus = this.isCollector ? baseCapacity * 0.25 : 0;

		return baseCapacity + techBonus + collectorBonus;
	}
}

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

export class AttackPower {
	amount: number;

	constructor(amount: number) {
		this.amount = amount;
	}

	warning(): boolean {
		return this.amount > 0;
	}
	danger(): boolean {
		return this.amount > 1000000;
	}
	unknown(): boolean {
		return this.amount == null;
	}
}

export class Coordinate {
	public galaxy: number;
	public system: number;
	public position: number;

	toString(): string {
		return `[${this.galaxy}:${this.system}:${this.position}]`;
	}
}
