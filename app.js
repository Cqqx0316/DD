const app = document.getElementById('app');
let connectedDevice = null; // 保存已连接的设备

document.getElementById('connect').addEventListener('click', async () => {
    if (!navigator.bluetooth) {
        alert('当前浏览器不支持 Web Bluetooth API');
        return;
    }
    try {
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb'] // 替换为设备支持的服务UUID
        });
        
        connectedDevice = device; // 保存设备引用
        document.getElementById('connect').style.display = 'none';
        document.getElementById('disconnect').style.display = 'inline-block';
        
        document.getElementById('device-info').innerText = `已连接设备: ${device.name || '未知设备'}`;

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb'); // 替换为服务UUID
        const characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb'); // 替换为特征UUID

        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
            const value = event.target.value;
            const buffer = new Uint8Array(value.buffer);
            
            // 解码为 GB2312 字符串并显示原始数据
            const decodedStr = decodeGB2312(buffer);
            const rawDataDiv = document.getElementById('raw-data');
            const now = new Date();
            const timeStamp = now.toLocaleString('zh-CN', {
                timeZone: 'Asia/Shanghai',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            rawDataDiv.innerText = `原始数据: ${decodedStr} [${timeStamp}]`;

                // 电量值
            const battery = parseInt(decodedStr.substr(2, 2), 16);

            // 解析传感器数据
            const sensors = [];
            const start = 4;
            for (let i = 0; i < 5; i++) {
                // 获取当前传感器的所有数据
                const temp = parseInt(decodedStr.substr(start + i * 2, 2), 16);
                const length = parseInt(decodedStr.substr(start + 10 + i * 2, 2), 16);
                const current = parseInt(decodedStr.substr(start + 20 + i * 2, 2), 16);

                sensors.push({
                    index: i + 1,
                    温度: temp === 0xFF ? '无效' : temp,
                    长度: length === 0xFF ? '无效' : length,
                    电流: current === 0xFF ? '无效' : current
                });
            }

            // 填充表格
            const table = document.getElementById('sensor-table');
            const tbody = table.querySelector('tbody');
            tbody.innerHTML = '';

            // 显示所有传感器数据
            sensors.forEach((s) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>碳刷${s.index}</td>
                    <td>${s.温度}</td>
                    <td>${s.长度}</td>
                    <td>${s.电流}</td>
                    <td>${battery}</td>`;
                tbody.appendChild(tr);
            });

            // 始终显示表格
            table.style.display = '';

        });

    } catch (error) {
        document.getElementById('device-info').innerText = `连接失败: ${error}`;
    }
});

// 添加断开连接的事件监听
document.getElementById('disconnect').addEventListener('click', async () => {
    if (connectedDevice && connectedDevice.gatt.connected) {
        await connectedDevice.gatt.disconnect();
        document.getElementById('device-info').innerText = '设备已断开连接';
        document.getElementById('raw-data').innerText = '';
        document.getElementById('sensor-table').style.display = 'none';
        document.getElementById('connect').style.display = 'inline-block';
        document.getElementById('disconnect').style.display = 'none';
    }
});

// 监听设备断开连接事件
connectedDevice?.addEventListener('gattserverdisconnected', () => {
    document.getElementById('device-info').innerText = '设备连接已断开';
    document.getElementById('raw-data').innerText = '';
    document.getElementById('sensor-table').style.display = 'none';
    document.getElementById('connect').style.display = 'inline-block';
    document.getElementById('disconnect').style.display = 'none';
});

// 自定义 GB2312 解码函数
function decodeGB2312(buffer) {
    // 使用 iconv-lite 或其他库进行 GB2312 解码
    // 如果没有库支持 GB2312，可以尝试手动映射字符集
    return new TextDecoder('gb2312').decode(buffer); // 如果浏览器支持 GB2312
}
