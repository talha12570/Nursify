import React, { useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';

const DEFAULT_PIN_COLOR = '#2B7A8E';
const DEFAULT_AVATAR =
	'https://images.unsplash.com/photo-1594824475544-3fa0e69cf2fd?w=256&h=256&fit=crop';

function buildCloudinaryUrl(url, sizePx = 256) {
	if (!url || !url.includes('res.cloudinary.com')) return url;
	// Skip if transformations already present
	if (url.includes('c_fill') || url.includes('/w_')) return url;
	const t = `w_${sizePx},h_${sizePx},c_fill,g_face,q_auto,f_auto`;
	return url.replace('/image/upload/', `/image/upload/${t}/`);
}

export default function NurseMapMarker({
	imageUri,
	pinColor = DEFAULT_PIN_COLOR,
	size = 60,
	onImageReady,
}) {
	const [useFallback, setUseFallback] = useState(false);

	const uri = buildCloudinaryUrl(
		useFallback || !imageUri ? DEFAULT_AVATAR : imageUri,
		256
	);

	// All dimensions derived from size prop (flat, no overlap clipping)
	const head = Math.round(size * 0.72);
	const outerAvatar = Math.round(head * 0.62);
	const innerAvatar = Math.round(outerAvatar * 0.82);
	const pointerHeight = Math.round(size * 0.32);
	const pointerHalfWidth = Math.round(size * 0.16);
	const markerWidth = head;
	const markerHeight = head + pointerHeight;

	return (
		<View
			style={[styles.container, { width: markerWidth, height: markerHeight }]}
			pointerEvents="none"
			collapsable={false}
		>
			<View style={[styles.pinHead, { width: head, height: head, borderRadius: head / 2, backgroundColor: pinColor }]}>
				<View
					style={[
						styles.outerAvatar,
						{
							width: outerAvatar,
							height: outerAvatar,
							borderRadius: outerAvatar / 2,
						},
					]}
				>
					<View
						style={[
							styles.innerAvatar,
							{
								width: innerAvatar,
								height: innerAvatar,
								borderRadius: innerAvatar / 2,
							},
						]}
					>
						<Image
							source={{ uri }}
							style={styles.avatarImage}
							resizeMode="cover"
							onError={() => setUseFallback(true)}
							onLoadEnd={() => onImageReady?.()}
						/>
					</View>
				</View>
			</View>

			<View
				style={[
					styles.pinPointer,
					{
						borderLeftWidth: pointerHalfWidth,
						borderRightWidth: pointerHalfWidth,
						borderTopWidth: pointerHeight,
						borderTopColor: pinColor,
					},
				]}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'flex-start',
		backgroundColor: 'transparent',
	},
	pinHead: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	outerAvatar: {
		backgroundColor: '#ffffff',
		alignItems: 'center',
		justifyContent: 'center',
	},
	innerAvatar: {
		overflow: 'hidden',
		backgroundColor: '#dbeafe',
	},
	avatarImage: {
		width: '100%',
		height: '100%',
	},
	pinPointer: {
		width: 0,
		height: 0,
		borderLeftColor: 'transparent',
		borderRightColor: 'transparent',
		borderTopColor: '#2B7A8E',
		marginTop: -1,
	},
});

