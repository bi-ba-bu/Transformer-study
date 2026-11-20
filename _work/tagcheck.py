from html.parser import HTMLParser
import sys

VOID = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}

class Checker(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, self.getpos()))

    def handle_startendtag(self, tag, attrs):
        pass

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.errors.append(f"extra </{tag}> at {self.getpos()}")
            return
        top, pos = self.stack.pop()
        if top != tag:
            self.errors.append(f"expected </{top}> at {pos}, got </{tag}> at {self.getpos()}")
            # 尝试恢复：把不匹配的标签继续弹出
            while self.stack and self.stack[-1][0] != tag:
                self.stack.pop()
            if self.stack:
                self.stack.pop()

html = open("index.html", encoding="utf-8").read()
c = Checker()
c.feed(html)
if c.stack:
    for tag, pos in c.stack[-10:]:
        print("unclosed", tag, pos)
print("errors", len(c.errors))
for e in c.errors[:20]:
    print(e)
sys.exit(1 if c.errors or c.stack else 0)
