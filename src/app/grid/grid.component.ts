import { AfterViewInit, Component, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { MatSort } from "@angular/material/sort";
import { MatTable, MatTableDataSource } from "@angular/material/table";

import { LATER_KEY } from "../app.component";
import { Coordinate } from "../models/coordinate.model";
import { SpyReport } from "../models/spy-report.model";

@Component({
	selector: "app-grid",
	templateUrl: "./grid.component.html",
	styleUrls: ["./grid.component.scss"],
})
export class GridComponent implements AfterViewInit {
	private _spyReports: SpyReport[] = [];
	@Input()
	public get spyReports(): SpyReport[] {
		return this._spyReports;
	}
	public set spyReports(value: SpyReport[]) {
		this._spyReports = value;
		console.log(value);
		this.dataSource.data = this._spyReports;
	}
	@Input()
	public universUrl: string;

	@Input()
	public isSavedForLater: boolean = false;

	@Output()
	public savedForLater: EventEmitter<SpyReport> = new EventEmitter<SpyReport>();

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
	public lastElementClicked: SpyReport;
	public dataSource: MatTableDataSource<SpyReport> = new MatTableDataSource(this.spyReports);

	@ViewChild(MatSort, { static: false }) sort: MatSort;
	@ViewChild(MatTable) matTable: MatTable<SpyReport>;

	ngAfterViewInit(): void {
		this.dataSource.sort = this.sort;
	}

	navigate(report: SpyReport, params?: ILinkParams): void {
		this.lastElementClicked = report;
		window.open(this.getLink(report.coordinates, "fleetdispatch", params), "_blank");
	}

	getLink(coordinate: Coordinate, component: string, params?: ILinkParams | ILinkParams[]): string {
		let link: string = `${this.universUrl}/game/index.php?page=ingame&component=${component}&galaxy=${coordinate.galaxy}&system=${coordinate.system}&position=${coordinate.position}&type=1&mission=1`;

		if (this.isArray(params)) {
			params.forEach((param: ILinkParams) => (link += `&${param.name}=${param.amount}`));
		} else {
			link += `&${params.name}=${params.amount}`;
		}
		return link;
	}

	remove(report: SpyReport): void {
		this.spyReports = this.spyReports.filter((rep: SpyReport) => rep !== report);
		this.dataSource.data = this.spyReports;

		if (this.isSavedForLater) {
			localStorage.setItem(LATER_KEY, JSON.stringify(this.spyReports));
		}
	}

	browse(report: SpyReport): void {
		window.open(this.getLink(report.coordinates, "galaxy"), "_blank");
	}

	saveForLater(element: SpyReport): void {
		this.savedForLater.emit(element);
		this.remove(element);
	}

	private isArray(param: ILinkParams | ILinkParams[]): param is ILinkParams[] {
		return Array.isArray(param);
	}
}

export interface ILinkParams {
	name: "am202" | "am203";
	amount: number;
}
