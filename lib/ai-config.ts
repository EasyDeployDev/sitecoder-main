import Together from "together-ai";

export interface AIGatewayOptions {
  baseURL?: string;
  apiKey?: string;
  defaultHeaders?: Record<string, string>;
}

export function getAIGatewayOptions(sessionId?: string): AIGatewayOptions {
  const options: AIGatewayOptions = {};

  if (process.env.AI_GATEWAY_BASE_URL) {
    options.baseURL = process.env.AI_GATEWAY_BASE_URL;
    options.apiKey = process.env.AI_GATEWAY_API_KEY;

    const headers: Record<string, string> = {};
    if (process.env.AI_GATEWAY_API_KEY) {
      headers["Authorization"] = `Bearer ${process.env.AI_GATEWAY_API_KEY}`;
    }
    if (sessionId) {
      headers["X-Session-Id"] = sessionId;
    }
    if (Object.keys(headers).length > 0) {
      options.defaultHeaders = headers;
    }

    return options;
  }

  if (process.env.HELICONE_API_KEY) {
    options.baseURL = "https://together.helicone.ai/v1";
    options.defaultHeaders = {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      "Helicone-Property-appname": "LlamaCoder",
      ...(sessionId ? { "Helicone-Session-Id": sessionId } : {}),
      "Helicone-Session-Name": "LlamaCoder Chat",
    };
  }

  return options;
}

export function createAIClient(sessionId?: string): Together {
  const options = getAIGatewayOptions(sessionId);
  return new Together(options);
}
