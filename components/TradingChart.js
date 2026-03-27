import React, { useEffect, useRef } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';

export default function TradingChart({ data, markers = [], isCandle = false }) {
    const chartContainerRef = useRef();
    const chartRef = useRef();

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // 设置图表的外观，白底灰字
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#6b7280',
                fontSize: 12,
                fontFamily: 'sans-serif',
            },
            grid: {
                vertLines: { color: 'rgba(243, 244, 246, 0.8)' },
                horzLines: { color: 'rgba(243, 244, 246, 0.8)' },
            },
            rightPriceScale: {
                borderVisible: false,
            },
            timeScale: {
                borderVisible: false,
                timeVisible: true,
                rightOffset: 2,
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        chartRef.current = chart;

        let mainSeries;
        // 判断是用红绿蜡烛图还是蓝色的面积走势图
        if (isCandle) {
            mainSeries = chart.addCandlestickSeries({
                upColor: '#16a34a',
                downColor: '#e11d48',
                borderVisible: false,
                wickUpColor: '#16a34a',
                wickDownColor: '#e11d48',
            });
        } else {
            mainSeries = chart.addAreaSeries({
                lineColor: '#00bcd4',
                topColor: 'rgba(0, 188, 212, 0.2)',
                bottomColor: 'rgba(0, 188, 212, 0.0)',
                lineWidth: 2,
                crosshairMarkerVisible: true,
                crosshairMarkerRadius: 4,
            });
        }

        mainSeries.setData(data);

        // 画出买入和卖出的标记点
        if (markers.length > 0) {
            mainSeries.setMarkers(markers);
        }

        chart.timeScale().fitContent();

        // 窗口大小改变时让图表自适应
        const handleResize = () => {
            chart.applyOptions({
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
            });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, markers, isCandle]);

    return <div ref={chartContainerRef} className="w-full h-full" />;
}
