import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { MatTableDataSource } from "@angular/material/table";
import { MatSort, MatSortable } from "@angular/material/sort";
import { MatSnackBar } from "@angular/material/snack-bar";

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
		"resources",
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
			this.snackbar.open(`found duplicate(s) ${duplicatesCoord.join(",")}`, "Ok");
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
			const sortable: MatSortable = {
				id: "resources",
				start: "desc",
				disableClear: false,
			};
			this.dataSource.sort.sort(sortable);
		}

		this.state = "closed";
		this.rawData = "";
	}

	parseReport(report: string): void {
		const result = new SpyReport();
		const resourceRegEx: RegExp = new RegExp("Ressources: (.*)");
		const coordRegex: RegExp = new RegExp(/(\[(.*)\])/);
		const defenseRegex: RegExp = new RegExp("Défense: (.*)");
		const activityRegex: RegExp = new RegExp(/Activité(.*\D)(\d+) minutes/);

		result.resources = this.stringToNumber(resourceRegEx.exec(report)[1]);
		result.setCoordinates(coordRegex.exec(report)[2]);
		result.noCargo = Math.ceil(result.resources / 2 / this.getCargoCapacity());

		const defense = defenseRegex.exec(report);
		result.defenses = defense ? this.stringToNumber(defense[1]) : null;

		const fleetRegex: RegExp = new RegExp(defense ? "Flottes: (.*)D" : "Flottes: (.*)");
		const fleets = fleetRegex.exec(report);
		result.flottes = fleets ? this.stringToNumber(fleets[1]) : null;

		result.activity = parseInt(activityRegex.exec(report)[2], 10);

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
		this.dataSource.data = this.spyReports.slice().filter((rep: SpyReport) => rep.defenses > 0);
	}

	clearFleet(): void {
		this.dataSource.data = this.spyReports.slice().filter((rep: SpyReport) => rep.flottes > 0);
	}

	clearBoth(): void {
		this.dataSource.data = this.spyReports
			.slice()
			.filter((rep: SpyReport) => rep.flottes === 0 && rep.defenses === 0);
	}

	navigate(report: SpyReport): void {
		this.lastElementClicked = report;
		window.open(this.getLink(report.coordinates, report.noCargo, "fleetdispatch"), "_blank");
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
	public flottes?: number;
	public defenses?: number;
	public noCargo: number;
	public coordinates: Coordinate;
	public activity: number;

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
}

export class Coordinate {
	public galaxy: number;
	public system: number;
	public position: number;

	toString(): string {
		return `[${this.galaxy}:${this.system}:${this.position}]`;
	}
}
