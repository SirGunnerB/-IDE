import { injectable } from 'inversify';
import { ILogger } from '../interfaces/ILogger';
import { ServiceConfig } from '../types/ServiceConfig';

@injectable()
export class SomeService {
    private logger: ILogger;
    private config: ServiceConfig;

    constructor(logger: ILogger, config: ServiceConfig) {
        this.logger = logger;
        this.config = config;
    }

    public async initialize(): Promise<void> {
        this.logger.info('Initializing SomeService');
        // initialization logic
    }

    public doSomething(): boolean {
        this.logger.debug('Doing something');
        return true;
    }

    private validateConfig(): Error | null {
        // validation logic
        return null;
    }
}
