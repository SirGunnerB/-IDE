interface APITest {
  name: string;
  endpoint: string;
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  expectations: APIExpectations;
}

interface APIExpectations {
  status?: number;
  headers?: Record<string, string>;
  body?: any;
  responseTime?: number;
  schema?: JSONSchema;
}

export class APITestingService {
  private client: HTTPClient;
  private schemaValidator: JSONSchemaValidator;
  private assertions: APIAssertions;

  async testEndpoint(test: APITest): Promise<APITestResult> {
    const startTime = performance.now();

    try {
      // Prepare request
      const request = await this.prepareRequest(test);

      // Send request
      const response = await this.client.send(request);

      // Measure response time
      const responseTime = performance.now() - startTime;

      // Validate response
      const validationResults = await this.validateResponse(
        response,
        responseTime,
        test.expectations
      );

      return this.createTestResult(test, response, validationResults);
    } catch (error) {
      return this.handleTestError(test, error);
    }
  }

  private async validateResponse(
    response: APIResponse,
    responseTime: number,
    expectations: APIExpectations
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate status code
    if (expectations.status) {
      results.push(
        await this.assertions.validateStatus(response.status, expectations.status)
      );
    }

    // Validate headers
    if (expectations.headers) {
      results.push(
        await this.assertions.validateHeaders(response.headers, expectations.headers)
      );
    }

    // Validate response body
    if (expectations.body) {
      results.push(
        await this.assertions.validateBody(response.body, expectations.body)
      );
    }

    // Validate schema
    if (expectations.schema) {
      results.push(
        await this.validateSchema(response.body, expectations.schema)
      );
    }

    // Validate response time
    if (expectations.responseTime) {
      results.push(
        await this.assertions.validateResponseTime(responseTime, expectations.responseTime)
      );
    }

    return results;
  }

  private async validateSchema(data: any, schema: JSONSchema): Promise<ValidationResult> {
    try {
      const isValid = await this.schemaValidator.validate(data, schema);
      return {
        valid: isValid,
        message: isValid ? 'Schema validation passed' : 'Schema validation failed',
        details: this.schemaValidator.errors
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Schema validation error',
        error
      };
    }
  }
} 