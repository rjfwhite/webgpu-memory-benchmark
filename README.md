# WebGPU Memory Benchmark

A comprehensive benchmark tool to test WebGPU memory allocation limits in browsers, specifically designed to discover the hidden memory limits in iOS Safari.

https://webgpu-memory-benchmark.vercel.app/

## 🎯 Purpose

iOS Safari has undocumented memory limits for WebGPU that can cause tabs to be killed when exceeded. This benchmark helps you:

- **Discover the exact memory limit** before your tab gets killed
- **Test both gradual and aggressive allocation patterns**
- **Monitor real-time memory usage** and allocation rates
- **Compare limits across different devices** and browsers

## 🚀 Features

- **Real-time metrics** - Monitor allocated memory, buffer count, texture count, and allocation rate
- **Two test modes**:
  - **Gradual Test**: Slowly increases memory allocation to find the soft limit
  - **Stress Test**: Aggressively allocates memory to trigger the hard limit quickly
- **Visual logging** with color-coded messages
- **Responsive design** optimized for mobile testing
- **Modern UI** with glassmorphism design

## 📱 iOS Safari Testing

This tool is specifically designed to test iOS Safari's WebGPU memory limits:

1. Open the benchmark on your iOS device in Safari
2. Run the "Start Memory Test" for a gradual approach
3. Or use "Stress Test" for quick limit discovery
4. Watch for tab crashes - this indicates the memory limit
5. Note the final allocated memory amount before the crash

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- A browser with WebGPU support

### Quick Start

1. **Clone and setup**:
   ```bash
   npm install
   ```

2. **Start development server**:
   ```bash
   npm run dev
   ```

3. **Open in browser**:
   Navigate to `http://localhost:5173`

4. **For iOS testing**:
   - Make your dev server accessible on your network
   - Use your computer's IP address instead of localhost
   - Or deploy to a hosting service

### Production Build

```bash
npm run build
npm run preview
```

## 🔧 Usage

### WebGPU Support Check
The tool automatically checks for WebGPU support and displays device limits including:
- Maximum buffer size
- Maximum storage buffer binding size  
- Maximum 2D texture dimensions

### Test Modes

**Gradual Memory Test**:
- Starts with 1MB allocations
- Gradually increases allocation size
- Includes both buffers and textures
- Stops at 2GB or when allocation fails

**Stress Test**:
- Rapidly allocates large chunks (8MB buffers + 1024x1024 textures)
- Designed to quickly hit memory limits
- Stops at 3GB or when allocation fails

### Memory Management
- **Clear Memory**: Destroys all allocated buffers and textures
- **Clear Log**: Clears the log display
- Real-time metrics update during allocation

## 📊 Understanding Results

### Key Metrics
- **Allocated Memory**: Total WebGPU memory allocated
- **Active Buffers**: Number of GPU buffers created
- **Active Textures**: Number of GPU textures created
- **Allocation Rate**: Speed of memory allocation (MB/s)

### Interpreting iOS Safari Limits
- **Tab crash**: The exact memory limit has been exceeded
- **Allocation errors**: Approaching the memory limit
- **Performance degradation**: Memory pressure building up

### Expected iOS Safari Limits
Based on device memory:
- **1GB RAM devices**: ~200-400MB WebGPU limit
- **2GB RAM devices**: ~400-800MB WebGPU limit  
- **4GB+ RAM devices**: ~800MB-1.5GB WebGPU limit

*Note: These are estimates and actual limits may vary*

## 🌐 Browser Compatibility

### Supported Browsers
- **Chrome/Edge 113+** (Full support)
- **Firefox 118+** (Behind flag `dom.webgpu.enabled`)
- **Safari 16.4+** (Partial support, iOS Safari has memory limits)

### WebGPU Availability
- ✅ **Desktop**: Windows, macOS, Linux
- ✅ **Mobile**: iOS 16.4+ Safari, Android Chrome 113+
- ❌ **Not supported**: Internet Explorer, older browsers

## 🔍 Technical Details

### Memory Allocation Strategy
The benchmark allocates two types of GPU memory:

1. **Buffers**: Storage buffers with `STORAGE | COPY_DST` usage
2. **Textures**: RGBA8 textures with `TEXTURE_BINDING | COPY_DST` usage

### Safety Features
- Progressive allocation to avoid immediate crashes
- Error handling for allocation failures
- Memory cleanup functionality
- UI responsiveness during allocation

## 🐛 Troubleshooting

### WebGPU Not Available
- Ensure your browser supports WebGPU
- Check if WebGPU is enabled in browser flags
- Verify you're using HTTPS or localhost

### Tab Crashes on iOS
- This is expected behavior when hitting memory limits
- Note the allocated memory amount before crash
- Try the gradual test mode for more precise measurement

### Allocation Errors
- May indicate you're approaching memory limits
- Try clearing memory and restarting the test
- Check browser console for detailed error messages

## 📝 Development

### Project Structure
```
webgpu-benchmark/
├── index.html          # Main HTML file
├── src/
│   └── main.js         # WebGPU benchmark implementation
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

### Adding Features
The `WebGPUMemoryBenchmark` class in `src/main.js` can be extended with:
- Additional allocation patterns
- Different buffer/texture configurations
- Performance profiling
- Memory usage analytics

## 📄 License

MIT License - feel free to use this tool for your WebGPU memory testing needs! 