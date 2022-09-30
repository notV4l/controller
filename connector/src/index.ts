import { Connector } from "@starknet-react/core";
import Controller, { Scope } from "@cartridge/controller";
import { AccountInterface } from "starknet";
import { BigNumberish } from "starknet/utils/number";

class ControllerConnector extends Connector {
    private controller: Controller;
    private _account: AccountInterface | null;

    constructor(
        scopes?: Scope[],
        options?: {
            url?: string;
            origin?: string;
        },
    ) {
        super({ options });
        this._account = null;
        this.controller = new Controller(scopes, options);
    }

    id() {
        return "cartridge";
    }

    name() {
        return "Cartridge";
    }

    available(): boolean {
        return true;
    }

    async ready() {
        return await this.controller.ready();
    }

    async register(username: string, credential: { x: string, y: string }) {
        return this.controller.register(username, credential);
    }

    async connect(): Promise<AccountInterface> {
        this._account = await this.controller.connect();
        if (!this._account) {
            throw new Error("account not found")
        }
        return this._account;
    }

    async disconnect(): Promise<void> {
        return Promise.resolve();
    }

    account() {
        return Promise.resolve(this._account);
    }
}

export default ControllerConnector;
