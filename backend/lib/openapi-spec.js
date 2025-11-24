/**
 * OpenAPI 3.0 Specification for CTO Dashboard API v2.0
 */

module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'CTO Dashboard API',
    version: '2.0.0',
    description: 'REST API for bug tracking, project portfolio management, and analytics',
    contact: {
      name: 'API Support',
      email: 'support@ctodashboard.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Development server'
    },
    {
      url: 'https://api.ctodashboard.com',
      description: 'Production server'
    }
  ],
  tags: [
    {
      name: 'Projects',
      description: 'Project portfolio management endpoints'
    },
    {
      name: 'Analytics',
      description: 'Dashboard analytics and insights'
    },
    {
      name: 'Ingestion',
      description: 'Data import and synchronization'
    },
    {
      name: 'Metrics',
      description: 'Metrics calculation and retrieval'
    },
    {
      name: 'Webhooks',
      description: 'Webhook receivers for external integrations'
    }
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Check API and database connectivity',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string', example: '2.0.0' },
                    database: { type: 'string', example: 'connected' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List all projects',
        description: 'Get paginated list of projects with optional filters',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['active', 'shipped', 'deferred', 'cancelled'] }
          },
          {
            name: 'language',
            in: 'query',
            schema: { type: 'string' }
          },
          {
            name: 'complexity_min',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 10 }
          },
          {
            name: 'complexity_max',
            in: 'query',
            schema: { type: 'integer', minimum: 1, maximum: 10 }
          },
          {
            name: 'search',
            in: 'query',
            schema: { type: 'string' }
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 20, maximum: 100 }
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaginatedProjectsResponse'
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Projects'],
        summary: 'Create new project',
        description: 'Create a new project (requires authentication)',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateProjectRequest'
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Project created successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                }
              }
            }
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError'
          }
        }
      }
    },
    '/api/projects/{id}': {
      get: {
        tags: ['Projects'],
        summary: 'Get project by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                }
              }
            }
          },
          '404': {
            $ref: '#/components/responses/NotFoundError'
          }
        }
      }
    },
    '/api/projects/{id}/bugs': {
      get: {
        tags: ['Projects'],
        summary: 'Get project bugs',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' }
          },
          {
            name: 'severity',
            in: 'query',
            schema: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] }
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'in_progress', 'verified', 'shipped', 'closed', 'deferred'] }
          }
        ],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/PaginatedResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/analytics/summary': {
      get: {
        tags: ['Analytics'],
        summary: 'Get dashboard summary',
        description: 'Comprehensive analytics overview for the dashboard',
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AnalyticsSummaryResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/analytics/trends': {
      get: {
        tags: ['Analytics'],
        summary: 'Get trend analysis',
        parameters: [
          {
            name: 'metric',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['bugs', 'revenue_impact', 'resolution_time', 'eng_hours'] }
          },
          {
            name: 'period',
            in: 'query',
            schema: { type: 'string', enum: ['7d', '30d', '90d', '1y'], default: '30d' }
          },
          {
            name: 'group_by',
            in: 'query',
            schema: { type: 'string', enum: ['day', 'week', 'month'], default: 'day' }
          }
        ],
        responses: {
          '200': {
            description: 'Trend data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/analytics/risks': {
      get: {
        tags: ['Analytics'],
        summary: 'Get risk assessment',
        description: 'Identify risks and issues across the portfolio',
        responses: {
          '200': {
            description: 'Risk analysis',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/RiskAssessmentResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/ingest/csv': {
      post: {
        tags: ['Ingestion'],
        summary: 'Upload CSV file',
        description: 'Import projects or bugs from CSV file',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'CSV file to upload'
                  },
                  type: {
                    type: 'string',
                    enum: ['projects', 'bugs'],
                    description: 'Type of data in CSV'
                  },
                  overwrite: {
                    type: 'boolean',
                    default: false
                  },
                  validate_only: {
                    type: 'boolean',
                    default: false
                  }
                },
                required: ['file', 'type']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'CSV processed successfully',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CsvImportResponse'
                }
              }
            }
          },
          '401': {
            $ref: '#/components/responses/UnauthorizedError'
          }
        }
      }
    },
    '/api/sync/github': {
      post: {
        tags: ['Ingestion'],
        summary: 'Trigger GitHub sync',
        description: 'Synchronize data from GitHub repositories',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  repository: {
                    type: 'string',
                    description: 'Repository to sync (owner/repo format)',
                    example: 'username/repo-name'
                  },
                  full_sync: {
                    type: 'boolean',
                    default: false
                  },
                  force: {
                    type: 'boolean',
                    default: false
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Sync initiated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/sync/status': {
      get: {
        tags: ['Ingestion'],
        summary: 'Get sync status',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'sync_id',
            in: 'query',
            schema: { type: 'string', format: 'uuid' }
          }
        ],
        responses: {
          '200': {
            description: 'Sync status',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/metrics/rebuild': {
      post: {
        tags: ['Metrics'],
        summary: 'Rebuild metrics',
        description: 'Regenerate metrics calculations',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  metric_type: {
                    type: 'string',
                    enum: ['monthly', 'portfolio', 'project', 'all'],
                    default: 'all'
                  },
                  start_date: {
                    type: 'string',
                    format: 'date-time'
                  },
                  end_date: {
                    type: 'string',
                    format: 'date-time'
                  },
                  force: {
                    type: 'boolean',
                    default: false
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Metrics rebuilt',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/metrics/daily': {
      get: {
        tags: ['Metrics'],
        summary: 'Get daily metrics',
        parameters: [
          {
            name: 'date',
            in: 'query',
            schema: { type: 'string', format: 'date' }
          },
          {
            name: 'days',
            in: 'query',
            schema: { type: 'integer', default: 30, maximum: 90 }
          }
        ],
        responses: {
          '200': {
            description: 'Daily metrics data',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                }
              }
            }
          }
        }
      }
    },
    '/api/webhooks/github': {
      post: {
        tags: ['Webhooks'],
        summary: 'GitHub webhook receiver',
        description: 'Receive and process GitHub webhook events',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'GitHub webhook payload'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Webhook processed',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SuccessResponse'
                }
              }
            }
          },
          '403': {
            description: 'Invalid signature',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'x-api-key',
        description: 'API key for authentication. Can also use Authorization: Bearer TOKEN'
      }
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'object' },
          meta: { type: 'object' }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              code: { type: 'string' }
            }
          }
        }
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: { type: 'array', items: { type: 'object' } },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' }
            }
          }
        }
      },
      PaginatedProjectsResponse: {
        allOf: [
          { $ref: '#/components/schemas/PaginatedResponse' }
        ]
      },
      CreateProjectRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 255 },
          description: { type: 'string' },
          github_url: { type: 'string', format: 'uri' },
          demo_url: { type: 'string', format: 'uri' },
          language: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['active', 'shipped', 'deferred', 'cancelled'], default: 'active' },
          complexity: { type: 'integer', minimum: 1, maximum: 10 },
          client_appeal: { type: 'integer', minimum: 1, maximum: 10 }
        }
      },
      AnalyticsSummaryResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              bugs: { type: 'object' },
              projects: { type: 'object' },
              portfolio: { type: 'object' },
              revenue_impact: { type: 'object' },
              trends: { type: 'object' },
              top_priority_bugs: { type: 'array' }
            }
          }
        }
      },
      RiskAssessmentResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              total_risks: { type: 'integer' },
              critical: { type: 'integer' },
              high: { type: 'integer' },
              medium: { type: 'integer' },
              low: { type: 'integer' },
              risks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    severity: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    impact: { type: 'string' },
                    recommendation: { type: 'string' },
                    affected_count: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      },
      CsvImportResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              imported: { type: 'integer' },
              failed: { type: 'integer' },
              total: { type: 'integer' },
              errors: { type: 'array', items: { type: 'object' } }
            }
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'API key is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      }
    }
  }
};
