const app = document.getElementById('app');

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
            rawDataDiv.innerText = `原始数据: ${decodedStr}`;

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

                // 只有当所有数据都不是 FF 时才添加到传感器列表
                if (temp !== 0xFF && length !== 0xFF && current !== 0xFF) {
                    sensors.push({
                        index: i + 1, // 保存传感器序号
                        温度: temp,
                        长度: length,
                        电流: current
                    });
                }
            }

            // 填充表格
            const table = document.getElementById('sensor-table');
            const tbody = table.querySelector('tbody');
            tbody.innerHTML = '';
            
            // 只显示有效的传感器数据
            sensors.forEach((s) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>碳刷${s.index}</td>
                    <td>${s.温度}</td>
                    <td>${s.长度}</td>
                    <td>${s.电流}</td>
                    <td>${battery}</td>`;
                tbody.appendChild(tr);
            });
            
            // 只有有数据时才显示表格
            table.style.display = sensors.length > 0 ? '' : 'none';
        });

    } catch (error) {
        document.getElementById('device-info').innerText = `连接失败: ${error}`;
    }
});

// 自定义 GB2312 解码函数
function decodeGB2312(buffer) {
    // 使用 iconv-lite 或其他库进行 GB2312 解码
    // 如果没有库支持 GB2312，可以尝试手动映射字符集
    return new TextDecoder('gb2312').decode(buffer); // 如果浏览器支持 GB2312
}