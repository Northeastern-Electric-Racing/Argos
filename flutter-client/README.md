# argos2

Argos in Flutter.

# Developer Getting Started


Depends on what platform you want to develop for.


## Supported platforms


### Web

### Android

### Linux


## Development practices

### Commands

`flutter run` to debug, `flutter run --release` to run speedy.
Hot reload is very nice and almost always works as expected.

### Structure

All code is inside of the `lib` folder. New packages are added to the
`pubspec.yaml`.  The root folder contains the main page, helpers, constants, and
global settings.  The `connection` folder contains the global connection state 
used for recieving data. `pages` contains all of the UI elements, which 
subscribe to data changes from providers in the `services` folder.

Specific platform settings are available in their specific platform folder, i.e.
windows, linux, etc. Those are to be changed when UI or setting elements are
outside the realm of flutter, such as the title of a web tab or the icon on the
android app launcher. 


### State management

State management is done via flutter riverpod, using global providers to manage
data.  These providers allow widgets to subscribe to changes in the underlying
data and rebuild when the data they depend on changes.  Therefore you should
keep any new providers as fine-grained to the data as possible, so you dont 
rebuild whenever some unrelated data point is modified.  

### Code Generation

Some of the Dart code must be generated from schemas, macros, and hooks. This 
includes our JSON, riverpod, and freezed code.  These all hook into a command called
`build_runner`.  So if you are editing any files with `part` directives at the
top, you must rebuild with `dart run build_runner build`.  This will recreate 
the `g.dart`, `freezed.dart` and more files. 

#### Protobuf

Unfortunately protobuf does not use build_runner (yet), so this is the command 
to do that.

```
dart pub global activate protoc_plugin
protoc --dart_out=. ./lib/connection/server_data.proto --plugin "$HOME/.pub-cache/bin"
```

### Routing

We use `go_router` to create routes between pages. This follows the web model of
URLs very closely.  All routers are defined in `main.dart`, and are not yet 
type safe.

### Settings

We use `SharedPreferences` to store simple key value pairs.  Make sure you
give them sane defaults and declare them in `constants.dart`.


## Best practices

### Dart

Think of Dart as if somebody wrote Javascript as if they wanted Typescript.
Meaning that it has similar end results to Typescript, but rather than just 
masking the raw web-ness of Javascript it truly follows the type-safe ideas to 
its core. Remember that Dart was written to replace Javascript. So dont lean 
into its wilder portions: Dont use the null types (`?`) unless you need to and 
really, really try to avoid `dynamic`.  AI will recommend it occassionally and 
there is one or two uses in Argos, but dont contribute to the problem.

### Flutter UI

Material UI is your friend.  If there is something you need to do, there is a 
strong possibility that it can be made from [material widgets](https://docs.flutter.dev/ui/widgets/material).
Use the types it provides to get a MVP, then tweak the styling as you see fit.  
Only as a last resort should you revert to raw painters, even if AI says so! 
Material widgets are handling consistent style, theme, sizing, accessibility,
and more literally for free.  Dont throw that away.

Also, the flutter built-in icons should be plentiful.  Dont add your own unless you check those first.

We use dynamic theming, sizing, and more in Argos flutter.  
DO NOT hardcode almost ANY color, widget size, or literally anything else.  Font size is like the only exception.
Anything you hardcode is one more thing that will work on your device then break on someone elses. 
We want to respect platform zoom ratios, sizing, and Material dynamic swatch theming.
Use APIs like `Theme.of` to get colors, `MediaQuery.of` to get screen size (then take a percentage), and more.
You do not need your widgets to be `const` if it means you are sacrificing the portability of using `context`.

### State division

This may sound unpopular but: Its OK to have some business logic right in the widget.
Do not form your providers such that they are tailor made to the data the widget needs. 
Make a provider fetch and transform data into a useful container, then in the widget rebuild
do a little math, a few IF statements, ternary operators too. its all chill. If you are importing `flutter` packages
in your `services` thats a good sign you need to rethink things.

### 3rd party packages

Be wary of third party packages.  Dart pub packages are often nearly as shit as 
npm, and that is saying something! Look for packages with somewhat consistent updates and
alot of stars on GitHub. Also beware of commercial packages, check the license of what you are getting.
And always think to yourself, can I spend the extra hour re-doing the package myself to save
six hours of dependency resolution hell in a year?

### Let the types guide you

The type system will show you the way to the settings you need.  Trust.

### Size assertions

You will get alot of errors when you use Lists, Expanded, and more. Essentially what these errors mean
is you put something that wants to use all space inside of something that also wants to use all space.
When two things fight over all of the space, the flutter compiler doesnt understand how to size them.
Therefore wrap something in a more statically sized type that bounds the inside (SizedBox, row, column). Or look for `shrinkWrap` available on many widgets, or consider using `Flex` properly (challenge: impossible).
When in doubt there are countless examples of people on the internet with the same issue as you.




