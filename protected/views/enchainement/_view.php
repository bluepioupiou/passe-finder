<div class="view">

	<b><?php echo CHtml::encode($data->getAttributeLabel('name')); ?>:</b>
	<?php echo CHtml::link(CHtml::encode($data->name), array('view', 'id'=>$data->id)); ?>
	<br />
	
	<b><?php echo CHtml::encode($data->getAttributeLabel('dateEvent')); ?>:</b>
	<?php echo CHtml::encode($data->dateEvent); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('commentaire')); ?>:</b>
	<?php echo CHtml::encode($data->commentaire); ?>
	<br />	
	
	<b><?php echo CHtml::encode($data->getAttributeLabel('passesCount')); ?>:</b>
	<?php echo CHtml::encode($data->passesCount); ?>
	<br />
	
	<b><?php echo CHtml::encode($data->getAttributeLabel('alternativesCount')); ?>:</b>
	<?php echo CHtml::encode($data->alternativesCount); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('videosCount')); ?>:</b>
	<?php echo CHtml::encode($data->videosCount); ?>
	<br />

	<b><?php echo CHtml::encode($data->getAttributeLabel('lesson_id')); ?>:</b>
	<?php 
		if ($data->lesson_id){
			echo CHtml::link(CHtml::encode($data->lesson->name)." - ".CHtml::encode($data->lesson->school->name), array('lesson/view', 'id'=>$data->lesson->id)); 
		}
		else {
			echo "Pas de cours associée";
		}
	?>
	<br />	

</div>