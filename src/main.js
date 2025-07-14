import { BenchmarkController } from './ui/BenchmarkController.js';

/**
 * WebGPU Memory Benchmark
 * Entry point for the application
 */

// Initialize the benchmark controller when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new BenchmarkController();
}); 