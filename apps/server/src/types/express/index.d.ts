declare namespace Express {
	export interface Request {
		locals: {
			userId: string;
		};
	}
}
