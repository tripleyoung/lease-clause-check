/** 화면에 그대로 보여 줄 한 문장과 HTTP 상태. */
export class CheckError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
