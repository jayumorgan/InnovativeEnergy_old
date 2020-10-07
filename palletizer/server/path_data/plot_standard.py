import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
import mpl_toolkits.mplot3d.art3d as art3d
import matplotlib.animation as animation
import json
from matplotlib.patches import Circle
import sys
import numpy as np


def load_data(fileName):
    with open(fileName) as reader:
        return json.load(reader)


def generateCoordinates(path):
    xs = []
    ys = []
    zs = []
    for p in path:
        x = p["x"]
        y = p["y"]
        z = p["z"]
        xs.append(x)
        ys.append(y)
        zs.append(z)
    return [xs, ys, zs]


def main(fileName):
    path = load_data(fileName)
    [xs, ys, zs] = generateCoordinates(path)
    zs = list(map(lambda z: -1 * z, zs))
    print("X : ", xs)
    print("Y : ", ys)
    print("Z : ", zs)

    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')
    title = ax.set_title(f"Path plot for pallet_config_id = {fileName}")

    ax.set_xlabel('X')
    ax.set_ylabel('Y')
    ax.set_zlabel('Z')
    graph, = ax.plot(np.array(xs), np.array(ys), np.array(zs))

    def update_graph(num):
        if num <= len(xs):
            x_points = np.array(xs[0:num])
            y_points = np.array(ys[0:num])
            z_points = np.array(zs[0:num])
            graph.set_data(x_points, y_points)
            graph.set_3d_properties(z_points)

    time_interval = 200
    animator = animation.FuncAnimation(fig,
                                       update_graph,
                                       len(xs),
                                       interval=time_interval,
                                       blit=False,
                                       repeat=False)
    plt.show()


if __name__ == "__main__":
    print(sys.argv)

    if len(sys.argv) > 1:
        fileName = sys.argv[1]
        print(fileName)
        main(fileName)
    else:
        print("No filename provided.")
