"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Global test setup
// Suppress console output during tests unless DEBUG=true
if (!process.env['DEBUG']) {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
}
//# sourceMappingURL=setup.js.map