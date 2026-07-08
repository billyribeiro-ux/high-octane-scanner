export interface Column<Row> {
	key: string;
	label: string;
	align?: 'left' | 'right' | 'center';
	sortable?: boolean;
	/** Raw value for sorting / default display. */
	value?: (row: Row) => string | number | null | undefined;
	/** Display override. */
	format?: (row: Row) => string;
	type?: 'text' | 'direction';
	colorBySign?: boolean;
	mono?: boolean;
}
