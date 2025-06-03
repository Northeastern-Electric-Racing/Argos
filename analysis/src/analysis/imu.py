import pandas as pd
import numpy as np
import os
import time
from src.analysis.psql import make_request
from scipy.signal import savgol_filter

import pyqtgraph as pg
from pyqtgraph.Qt import QtCore
from pyqtgraph.Qt import QtWidgets
from pyqtgraph.Qt import QtGui


def main():
    pwd = os.getcwd()
    start_time = "06-01-2025 21:00:08"
    end_time = "06-01-2025 21:01:50"

    result = make_request(
        f"\\COPY (SELECT values[1] / 10000 as \"X\",  values[2] / 10000 as \"Y\", values[3] / 10000 as \"Z\", time FROM data WHERE \"dataTypeName\"='MSB/FR/Accel' AND time > '{start_time}' AND time < '{end_time}') to '{pwd}/data/data.csv' WITH CSV HEADER;"
    )
    print("result: ", result)

    # Load data
    x_y_z_df = pd.read_csv("data/data.csv")

    x = pd.to_numeric(x_y_z_df.iloc[:, 1], errors="coerce").to_numpy()
    y = pd.to_numeric(x_y_z_df.iloc[:, 0], errors="coerce").to_numpy()
    time_stamps = pd.to_datetime(x_y_z_df.iloc[:, 3])
    # Drop NaNs
    valid = ~np.isnan(x) & ~np.isnan(y)
    x, y, time_stamps = x[valid], y[valid], time_stamps[valid]

    # window_length must be odd and <= len(data), polyorder < window_length
    window_length = 29  # choose odd number ~ size of smoothing window
    polyorder = 5  # polynomial order

    x_smooth = savgol_filter(x, window_length, polyorder)
    y_smooth = savgol_filter(y, window_length, polyorder)

    # Time deltas in seconds relative to first timestamp
    t0 = time_stamps.iloc[0]
    time_deltas = (time_stamps - t0).dt.total_seconds().to_numpy(dtype=float)

    # PyQtGraph setup
    app = QtWidgets.QApplication([])

    win = pg.GraphicsLayoutWidget(show=True, title="G-Force Circle Playback")
    win.resize(600, 600)
    plot = win.addPlot(title="G-Force Circle Playback")
    plot.setAspectLocked(True)
    plot.setXRange(-2, 2)
    plot.setYRange(-2, 2)
    plot.setLabel("bottom", "Lateral G")
    plot.setLabel("left", "Longitudinal G")

    # Draw circles
    for r in [0.5, 1, 1.5, 2]:
        circle = QtWidgets.QGraphicsEllipseItem(-r, -r, 2 * r, 2 * r)
        pen = pg.mkPen("lightgray")
        pen.setStyle(QtCore.Qt.DashLine)
        circle.setPen(pen)
        plot.addItem(circle)

    # Dot for current position
    dot = pg.ScatterPlotItem(size=12, brush="r")
    plot.addItem(dot)

    # Timestamp text
    timestamp_text = pg.TextItem(
        text="",
        color="k",  # text color black
        fill=pg.mkBrush(255, 255, 255, 200),  # semi-transparent white background
        border=pg.mkPen("k"),  # black border
    )
    timestamp_text.setFont(QtGui.QFont("Arial", 12))
    timestamp_text.setPos(-1.9, 1.9)
    plot.addItem(timestamp_text)

    # Playback variables
    start_wall_time = time.time()
    frame_idx = 0
    n_frames = len(x)

    def schedule_next():
        nonlocal frame_idx
        if frame_idx >= n_frames:
            return

        now = time.time()
        target_time = start_wall_time + time_deltas[frame_idx]
        wait_ms = max(0, int((target_time - now) * 1000))

        QtCore.QTimer.singleShot(wait_ms, update)

    def update():
        nonlocal frame_idx
        if frame_idx >= n_frames:
            return

        dot.setData([x_smooth[frame_idx]], [y_smooth[frame_idx]])
        timestamp_text.setText(f"Time: {time_deltas[frame_idx]:.2f} s")
        frame_idx += 1
        schedule_next()

    schedule_next()

    QtWidgets.QApplication.instance().exec_()


if __name__ == "__main__":
    main()
