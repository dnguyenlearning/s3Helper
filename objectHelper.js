function traverseObject(json_object_array, action) {
    _.each(json_object_array, function(object) {
        var stack = [];
        stack.push(object);
        while (stack.length > 0) {
            var curr = stack.pop();
            if (curr) {
                action(curr);
            }
            if (curr && curr.hasOwnProperty('children')) {
                _.each(curr['children'], function(child) {
                    stack.push(child);
                });
            }
        }
    });
}