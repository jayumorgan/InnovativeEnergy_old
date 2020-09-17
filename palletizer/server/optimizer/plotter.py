import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

import json


def load_data():
    with open("../data3d.json") as reader:
        return json.load(reader)


def generate_plots_for_path(d, ax):
    xs = []
    ys = []
    zs = []
    max_h = 0
    for point in d:
        x = point["x"]
        y = point["y"]
        z = point["z"]
        if z > max_h:
            max_h = z

        xs.append(x)
        ys.append(y)
        zs.append(z)
    zs = list(map(lambda x: max_h - x, zs))
    ax.plot(xs, ys, zs)


if __name__ == "__main__":
    data = load_data()
    fig = plt.figure()
    ax = fig.add_subplot(111, projection='3d')
    for d in data:
        print("next")
        generate_plots_for_path(d, ax)
    plt.show()
