<?php
	if ($data->Type == "Evolution"){
		$alertType = "alert i_valid";
	}
	else if ($data->Type == "Correction"){
		$alertType = "alert i_warning";
	}
	else if ($data->Type == "Modification"){
		$alertType = "alert i_info";
	}
?>

<span class="<?php echo $alertType; ?>">
<?php echo CHtml::encode($data->Date); ?>
:
<?php echo CHtml::encode($data->Texte); ?>
</span><br/>