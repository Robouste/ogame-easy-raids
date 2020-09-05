import { animate, state, style, transition, trigger } from "@angular/animations";
import { Component, ViewChild } from "@angular/core";
import { MatSnackBar } from "@angular/material/snack-bar";

import { GridComponent } from "./grid/grid.component";
import { AttackPower } from "./models/attack-power.model";
import { SpyReport } from "./models/spy-report.model";

export const TECH_LVL_STORAGE_KEY: string = "techLvl";
export const IS_COLLECTOR_STORAGE_KEY: string = "isCollector";
export const UNIVERS_URL_STORAGE_KEY: string = "universUrl";
export const LATER_KEY: string = "later";

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
export class AppComponent {
	public state: string = "opened";
	public rawData: string;
	public spyReports: SpyReport[] = [];
	public savedForLater: SpyReport[];
	public cargoCapacity: number = 41250;
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

	@ViewChild("reportsGrid") reportsGrid: GridComponent;
	@ViewChild("savedGrid") savedGrid: GridComponent;

	constructor(private snackbar: MatSnackBar) {
		this.techLvl = parseInt(localStorage.getItem(TECH_LVL_STORAGE_KEY), 10) ?? 0;
		this.isCollector = !!parseInt(localStorage.getItem(IS_COLLECTOR_STORAGE_KEY), 10);
		this.universUrl = localStorage.getItem(UNIVERS_URL_STORAGE_KEY);
		const fucknames = (JSON.parse(localStorage.getItem(LATER_KEY)) as SpyReport[]) ?? [];
		this.savedForLater = fucknames.map((report: SpyReport) =>
			new SpyReport(this.getCargoCapacity()).fromJson(report)
		);
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

		this.spyReports.sort((a, b) => {
			if (a.noCargo === b.noCargo) {
				return a.resources > b.resources ? -1 : 1;
			}
			return a.noCargo > b.noCargo ? -1 : 1;
		});

		this.reportsGrid.dataSource.data = this.spyReports;

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

	saveForLater(report: SpyReport): void {
		let existing: SpyReport = this.savedForLater.find(
			(item: SpyReport) => item.coordinates.toString() === report.coordinates.toString()
		);

		if (existing) {
			existing = report;
		} else {
			this.savedForLater.push(report);
		}

		this.savedGrid.dataSource.data = this.savedForLater;
		// console.log(JSON.stringify(this.savedForLater));
		localStorage.setItem(LATER_KEY, JSON.stringify(this.savedForLater));
	}
}
