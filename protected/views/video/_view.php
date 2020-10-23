<div class="view">

	<b><?php echo CHtml::encode($data->getAttributeLabel('name')); ?>:</b>
	<?php echo CHtml::link(CHtml::encode($data->enchainement->name), array('video/view', 'id'=>$data->id)); ?>
	<br />
	
	<b>Cours:</b>
	<?php echo CHtml::link(CHtml::encode($data->enchainement->lesson->name), array('lesson/view', 'id'=>$data->enchainement->lesson->id))." (".CHtml::encode($data->enchainement->lesson->school->name).")"; ?>
	<br />	
	
	<b><?php echo CHtml::encode($data->getAttributeLabel('description')); ?>:</b>
	<?php echo CHtml::encode($data->description); ?>
	<br />
</div>