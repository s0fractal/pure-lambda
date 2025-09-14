#!/bin/bash
# SVGx Canonicalizer - Ensures deterministic SVG output
# Usage: ./canonicalize.sh < input.svg > output.svg

set -euo pipefail

# Python script for precise canonicalization
python3 -c '
import sys
import re
import xml.etree.ElementTree as ET
from collections import OrderedDict

def format_number(num_str):
    """Format number to exactly 3 decimal places"""
    try:
        num = float(num_str)
        return f"{num:.3f}"
    except:
        return num_str

def canonicalize_attributes(elem):
    """Sort attributes lexicographically and format numbers"""
    if elem.attrib:
        # Process and sort attributes
        sorted_attribs = OrderedDict()
        for key in sorted(elem.attrib.keys()):
            value = elem.attrib[key]

            # Format numbers in coordinate-like attributes
            if key in ["x", "y", "x1", "y1", "x2", "y2", "width", "height",
                      "cx", "cy", "r", "rx", "ry", "font-size"]:
                value = format_number(value)

            # Format points in polyline/polygon
            elif key == "points":
                points = value.split()
                formatted = []
                for point in points:
                    coords = point.split(",")
                    if len(coords) == 2:
                        formatted.append(f"{format_number(coords[0])},{format_number(coords[1])}")
                value = " ".join(formatted)

            # Format viewBox
            elif key == "viewBox":
                parts = value.split()
                if len(parts) == 4:
                    value = " ".join(format_number(p) for p in parts)

            # Format path data
            elif key == "d":
                # Basic number formatting in path data
                value = re.sub(r"(-?\d+\.?\d*)",
                              lambda m: format_number(m.group(1)), value)

            sorted_attribs[key] = value

        # Clear and reset attributes in sorted order
        elem.attrib.clear()
        elem.attrib.update(sorted_attribs)

def validate_element(elem):
    """Check if element is allowed in SVGx"""
    allowed_tags = {"svg", "g", "rect", "path", "line", "polyline", "text"}
    tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag

    if tag not in allowed_tags:
        raise ValueError(f"Element <{tag}> not allowed in SVGx")

    # Check for forbidden attributes
    forbidden = {"id", "class", "style", "onclick", "onmouseover"}
    for attr in elem.attrib:
        if attr in forbidden:
            raise ValueError(f"Attribute {attr} not allowed in SVGx")

def canonicalize_svg(root):
    """Recursively canonicalize SVG tree"""
    validate_element(root)
    canonicalize_attributes(root)

    # Sort children by tag name, then by position attributes
    def child_sort_key(child):
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
        x = child.get("x", child.get("x1", "0"))
        y = child.get("y", child.get("y1", "0"))
        return (tag, format_number(x), format_number(y))

    # Process children
    children = list(root)
    for child in children:
        canonicalize_svg(child)

    # Sort and reattach children
    if children:
        root[:] = sorted(children, key=child_sort_key)

def main():
    # Parse SVG from stdin
    svg_content = sys.stdin.read()

    # Parse with ElementTree
    root = ET.fromstring(svg_content)

    # Canonicalize
    canonicalize_svg(root)

    # Add consistent XML declaration and namespace
    root.set("xmlns", "http://www.w3.org/2000/svg")

    # Output canonicalized SVG
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    tree = ET.ElementTree(root)

    # Manual serialization for consistent output
    result = ET.tostring(root, encoding="unicode", method="xml")

    # Remove extra whitespace and ensure consistent formatting
    result = re.sub(r">\s+<", "><", result)  # Remove whitespace between elements
    result = re.sub(r"\s+", " ", result)     # Normalize internal whitespace
    result = result.strip()

    print(result)

if __name__ == "__main__":
    main()
'