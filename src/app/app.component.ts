import { Component, OnInit, ViewChild, AfterViewInit } from "@angular/core";
import { trigger, state, style, transition, animate } from "@angular/animations";
import { MatTableDataSource } from "@angular/material/table";
import { MatSort, MatSortable } from "@angular/material/sort";
import { MatSnackBar } from "@angular/material/snack-bar";

export const TECH_LVL_STORAGE_KEY: string = "techLvl";
export const IS_COLLECTOR_STORAGE_KEY: string = "isCollector";
@Component({
	selector: "app-root",
	templateUrl: "./app.component.html",
	styleUrls: ["./app.component.scss"],
	animations: [
		trigger("slide", [
			state("closed", style({ height: "0px", minHeight: "0" })),
			state("opened", style({ height: "*" })),
			transition("opened <=> closed", animate("225ms cubic-bezier(0.4, 0.0, 0.2, 1)")),
		]),
	],
})
export class AppComponent implements AfterViewInit {
	public state: string = "opened";
	public rawData: string;
	public spyReports: SpyReport[] = [];
	public displayedColumns: string[] = ["index", "resources", "flottes", "defenses", "noCargo", "coordinates"];
	public dataSource: MatTableDataSource<SpyReport> = new MatTableDataSource(this.spyReports);
	public cargoCapacity: number = 41250;
	public lastElementClicked: SpyReport;

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
		this.techLvl = parseInt(localStorage.getItem(TECH_LVL_STORAGE_KEY)) ?? 0;
		this.isCollector = !!parseInt(localStorage.getItem(IS_COLLECTOR_STORAGE_KEY));
		console.log(parseInt(localStorage.getItem(IS_COLLECTOR_STORAGE_KEY)));
	}

	ngOnInit(): void {}

	ngAfterViewInit(): void {
		this.dataSource.sort = this.sort;
	}

	setTechStorage(value: number): void {
		localStorage.setItem(TECH_LVL_STORAGE_KEY, value.toString());
	}

	setIsCollectorStorage(value: boolean): void {
		console.log(value);
		localStorage.setItem(IS_COLLECTOR_STORAGE_KEY, value ? "1" : "0");
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
			this.snackbar.open(`found duplicate(s) ${duplicatesCoord.join(",")}`);
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
	}

	parseReport(report: string): void {
		const result = new SpyReport();
		const resourceRegEx: RegExp = new RegExp("Ressources: (.*)");
		const coordRegex: RegExp = new RegExp(/(\[(.*)\])/);
		const fleetRegex: RegExp = new RegExp("Flottes: (.*)D");
		const defenseRegex: RegExp = new RegExp("Défense: (.*)");

		result.setRessources(resourceRegEx.exec(report)[1], this.getCargoCapacity());
		result.setCoordinates(coordRegex.exec(report)[2]);
		const fleets = fleetRegex.exec(report);
		result.flottes = fleets ? fleetRegex.exec(report)[1] : "??";
		const defense = defenseRegex.exec(report);
		result.defenses = defense ? defenseRegex.exec(report)[1] : "??";

		this.spyReports.push(result);
	}

	resetFilter(): void {
		this.dataSource.data = this.spyReports;
	}

	clearDefense(): void {
		this.dataSource.data = this.spyReports.slice().filter((rep: SpyReport) => rep.defenses === "0");
	}

	clearFleet(): void {
		this.dataSource.data = this.spyReports.slice().filter((rep: SpyReport) => rep.flottes === "0");
	}

	clearBoth(): void {
		this.dataSource.data = this.spyReports
			.slice()
			.filter((rep: SpyReport) => rep.flottes === "0" && rep.defenses === "0");
	}

	navigate(report: SpyReport): void {
		this.lastElementClicked = report;
		window.open(this.getLink(report.coordinates, report.noCargo), "_blank");
	}

	getLink(coordinate: Coordinate, cargo: number): string {
		return `https://s172-fr.ogame.gameforge.com/game/index.php?page=ingame&component=fleetdispatch&galaxy=${coordinate.galaxy}&system=${coordinate.system}&position=${coordinate.position}&type=1&mission=1&cargo=${cargo}`;
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
	public flottes: string;
	public defenses: string;
	public noCargo: number;
	public coordinates: Coordinate;

	setRessources(rawResource: string, capacity: number): void {
		rawResource = rawResource.replace(",", "");
		rawResource = rawResource.replace(".", "");

		if (rawResource.includes("M")) {
			rawResource = rawResource.slice(0, -1);
			this.resources = parseFloat(rawResource) * 1000;
		} else {
			this.resources = parseFloat(rawResource);
		}

		this.noCargo = Math.ceil(this.resources / 2 / capacity);
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
}

export class Coordinate {
	public galaxy: number;
	public system: number;
	public position: number;

	toString(): string {
		return `[${this.galaxy}:${this.system}:${this.position}]`;
	}
}
