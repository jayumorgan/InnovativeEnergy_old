#!/bin/sh julia


# In: (Pallet, Box) -> Out: (Coordinates[])
# Step 2: In (Pallet, Box[]) => Out: (Coordinates_By_Box[])

# Structs are immutable.
struct Pallet
    length::Float64 # y
    width::Float64  # x
end
   

struct Box
    length::Float64 # y
    width::Float64 # x 
    height::Float64 # z 
end














