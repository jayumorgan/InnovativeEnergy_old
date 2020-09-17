import matplotlib.pyplot as plt
import json


def load_data():
    with open("../data.json") as reader:
        return json.load(reader)


def generate_plots_for_path(d):
    xs = []
    ys = []

    for point in d:
        print(point)
        xs.append(point["x"])
        ys.append(point["y"])

    plt.scatter(xs, ys)


if __name__ == "__main__":
    data = load_data()

    for d in data:
        print("next")
        generate_plots_for_path(d)
    plt.show()
