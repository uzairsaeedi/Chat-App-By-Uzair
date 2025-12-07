if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "C:/Users/uzair/.gradle/caches/8.10.2/transforms/835c7fc77adcc806d35d2238e408e225/transformed/hermes-android-0.76.9-debug/prefab/modules/libhermes/libs/android.arm64-v8a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/uzair/.gradle/caches/8.10.2/transforms/835c7fc77adcc806d35d2238e408e225/transformed/hermes-android-0.76.9-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

