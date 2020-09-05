export class AttackPower {
	public amount: number;

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
